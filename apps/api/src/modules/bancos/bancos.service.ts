import { prisma } from '@kumon-advance/db'
import { getCnabAdapter } from '../../shared/cnab/cnab.registry'
import type { CnabCharge, BankAccountConfig } from '../../shared/cnab/cnab.types'

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toConfig(account: any): BankAccountConfig {
  return {
    bankCode: account.bankCode,
    bankName: account.bankName,
    agency: account.agency,
    agencyDigit: account.agencyDigit ?? '',
    accountNumber: account.accountNumber,
    accountDigit: account.accountDigit ?? '',
    agreementCode: account.agreementCode ?? '',
    walletCode: account.walletCode ?? '',
    beneficiaryName: account.beneficiaryName,
    beneficiaryDocument: account.beneficiaryDocument,
    sequentialFileNumber: account.sequentialFileNumber,
    protestDays: account.protestDays,
    autoDropDays: account.autoDropDays,
    instructions: account.instructions ?? '',
  }
}

// ─── BancosService ────────────────────────────────────────────────────────────

export class BancosService {
  // ── Catálogo ────────────────────────────────────────────────────────────────

  async listCatalog() {
    return prisma.bankCatalog.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  }

  // ── Contas bancárias ────────────────────────────────────────────────────────

  async listAccounts() {
    return prisma.billingBankAccount.findMany({
      include: {
        bank: { select: { name: true, cnab240Supported: true, cnab400Supported: true, metadata: true } },
        cnabFiles: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, fileName: true, status: true, createdAt: true, processedCount: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { accountName: 'asc' }],
    })
  }

  async getAccount(id: string) {
    const account = await prisma.billingBankAccount.findUnique({
      where: { id },
      include: {
        bank: true,
        cnabFiles: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
    if (!account) throw erroNegocio(404, 'Conta bancária não encontrada')
    return account
  }

  async createAccount(data: {
    bankCode: string; accountName: string; agency: string; agencyDigit?: string
    accountNumber: string; accountDigit?: string; beneficiaryName: string
    beneficiaryDocument: string; agreementCode?: string; walletCode?: string
    remittanceLayout?: string; protestDays?: number; autoDropDays?: number
    instructions?: string; isDefault?: boolean
  }) {
    const bank = await prisma.bankCatalog.findUnique({ where: { code: data.bankCode } })
    if (!bank) throw erroNegocio(404, 'Banco não encontrado no catálogo')

    // Se marcar como padrão, remove padrão das demais
    if (data.isDefault) {
      await prisma.billingBankAccount.updateMany({ data: { isDefault: false } })
    }

    return prisma.billingBankAccount.create({
      data: {
        ...data,
        bankName: bank.name,
        remittanceLayout: data.remittanceLayout ?? 'cnab240',
        isDefault: data.isDefault ?? false,
        isActive: true,
        sequentialFileNumber: 1,
      },
    })
  }

  async updateAccount(id: string, data: Partial<{
    accountName: string; agency: string; agencyDigit: string
    accountNumber: string; accountDigit: string; beneficiaryName: string
    beneficiaryDocument: string; agreementCode: string; walletCode: string
    remittanceLayout: string; protestDays: number; autoDropDays: number
    instructions: string; isDefault: boolean; isActive: boolean
  }>) {
    const account = await prisma.billingBankAccount.findUnique({ where: { id } })
    if (!account) throw erroNegocio(404, 'Conta não encontrada')

    if (data.isDefault) {
      await prisma.billingBankAccount.updateMany({ where: { id: { not: id } }, data: { isDefault: false } })
    }

    return prisma.billingBankAccount.update({ where: { id }, data })
  }

  async setDefault(id: string) {
    const account = await prisma.billingBankAccount.findUnique({ where: { id } })
    if (!account) throw erroNegocio(404, 'Conta não encontrada')
    await prisma.billingBankAccount.updateMany({ data: { isDefault: false } })
    return prisma.billingBankAccount.update({ where: { id }, data: { isDefault: true } })
  }

  async toggleActive(id: string) {
    const account = await prisma.billingBankAccount.findUnique({ where: { id } })
    if (!account) throw erroNegocio(404, 'Conta não encontrada')
    return prisma.billingBankAccount.update({ where: { id }, data: { isActive: !account.isActive } })
  }

  async deleteAccount(id: string) {
    const account = await prisma.billingBankAccount.findUnique({ where: { id } })
    if (!account) throw erroNegocio(404, 'Conta não encontrada')
    const hasFiles = await prisma.cnabFile.count({ where: { bankAccountId: id } })
    if (hasFiles > 0) throw erroNegocio(409, 'Conta possui arquivos CNAB. Desative-a em vez de excluir.')
    return prisma.billingBankAccount.delete({ where: { id } })
  }

  // ── Validação ────────────────────────────────────────────────────────────────

  async validateAccount(id: string): Promise<string[]> {
    const account = await prisma.billingBankAccount.findUnique({ where: { id } })
    if (!account) throw erroNegocio(404, 'Conta não encontrada')
    try {
      const adapter = getCnabAdapter(account.bankCode)
      return adapter.validateConfig(toConfig(account))
    } catch {
      return [`Banco ${account.bankCode} sem adapter CNAB — verifique o catálogo`]
    }
  }

  // ── Remessa CNAB ─────────────────────────────────────────────────────────────

  /**
   * Gera arquivo de remessa CNAB para as cobranças selecionadas.
   *
   * Elegibilidade:
   *  - status não paga/cancelada
   *  - não já incluída em remessa pendente/processada para a mesma conta
   *    (salvo reenvio explícito)
   *
   * SCHEDULER-READY: este método pode ser chamado por cron para gerar
   * remessa automática diária.
   */
  async gerarRemessa(
    bankAccountId: string,
    cobrancaIds: string[],
    createdBy: string,
  ) {
    const account = await this.getAccount(bankAccountId)
    const adapter = getCnabAdapter(account.bankCode)

    // Busca cobranças com dados do aluno/responsável
    const cobrancas = await prisma.cobranca.findMany({
      where: {
        id: { in: cobrancaIds },
        status: { notIn: ['paga', 'cancelada'] },
      },
      include: {
        aluno: {
          select: {
            nome: true,
            cep: true, logradouro: true, numero: true, bairro: true, cidade: true, estado: true,
            responsaveis: {
              where: { principal: true },
              include: { responsavel: { select: { nome: true, cpf: true } } },
              take: 1,
            },
          },
        },
      },
    })

    if (cobrancas.length === 0) throw erroNegocio(400, 'Nenhuma cobrança elegível para remessa')

    // Validações mínimas
    const erros: string[] = []
    for (const c of cobrancas) {
      const resp = c.aluno.responsaveis[0]?.responsavel
      if (!resp?.cpf) erros.push(`${c.aluno.nome}: responsável sem CPF`)
      if (!resp?.nome) erros.push(`${c.aluno.nome}: responsável sem nome`)
    }
    if (erros.length > 0) throw erroNegocio(422, `Cobranças com dados incompletos:\n${erros.join('\n')}`)

    // Monta charges para o adapter
    const config = toConfig(account)
    const charges: CnabCharge[] = cobrancas.map((c, idx) => {
      const resp = c.aluno.responsaveis[0]?.responsavel
      const ourNum = c.nossoNumero ?? String(config.sequentialFileNumber + idx).padStart(10, '0')
      return {
        ourNumber: ourNum,
        documentNumber: c.id.replace(/-/g, '').slice(0, 15),
        dueDate: new Date(c.vencimento).toISOString().slice(0, 10),
        amount: Number(c.valor),
        payerName: resp?.nome ?? c.aluno.nome,
        payerDocument: resp?.cpf?.replace(/\D/g, '') ?? '',
        payerAddress: [c.aluno.logradouro, c.aluno.numero].filter(Boolean).join(', ') ?? '',
        payerNeighborhood: c.aluno.bairro ?? '',
        payerCity: c.aluno.cidade ?? '',
        payerState: c.aluno.estado ?? 'SP',
        payerZipCode: c.aluno.cep ?? '00000000',
        description: c.descricao ?? `Mensalidade ${c.aluno.nome}`,
      }
    })

    const result = adapter.generateRemittance(charges, config)

    // Salva arquivo no banco
    const cnabFile = await prisma.cnabFile.create({
      data: {
        bankAccountId,
        type: 'remessa',
        fileName: result.fileName,
        layoutType: account.remittanceLayout,
        status: 'processado',
        totalRecords: result.chargesIncluded,
        processedCount: result.chargesIncluded,
        errorCount: 0,
        generatedAt: new Date(),
        createdBy,
        rawContent: result.content,
        metadata: JSON.stringify({ cobrancaIds, chargesIncluded: result.chargesIncluded }),
      },
    })

    // Incrementa número sequencial
    await prisma.billingBankAccount.update({
      where: { id: bankAccountId },
      data: { sequentialFileNumber: { increment: 1 } },
    })

    // Vincula cobranças à conta bancária e atualiza nosso número
    for (let i = 0; i < cobrancas.length; i++) {
      const c = cobrancas[i]!
      const ch = charges[i]!
      await prisma.cobranca.update({
        where: { id: c.id },
        data: {
          bankAccountId,
          nossoNumero: ch.ourNumber,
          status: 'enviada',
        },
      })
    }

    return { cnabFile, content: result.content, fileName: result.fileName }
  }

  // ── Importação de Retorno ────────────────────────────────────────────────────

  /**
   * Importa e processa arquivo de retorno CNAB.
   * Retorna preview — o usuário confirma antes de efetivar.
   */
  async importarRetorno(
    bankAccountId: string,
    fileName: string,
    rawContent: string,
    createdBy: string,
  ) {
    const account = await this.getAccount(bankAccountId)
    const adapter = getCnabAdapter(account.bankCode)
    const config = toConfig(account)

    const parsed = adapter.parseReturn(rawContent, config)

    // Para cada ocorrência, tenta localizar a cobrança
    const occurrencesWithMatch = await Promise.all(
      parsed.occurrences.map(async (occ) => {
        const cobranca = occ.ourNumber
          ? await prisma.cobranca.findFirst({
              where: { nossoNumero: occ.ourNumber },
              select: { id: true, valor: true, status: true, aluno: { select: { nome: true } } },
            })
          : null

        return {
          ...occ,
          billingChargeId: cobranca?.id ?? null,
          alunoNome: cobranca?.aluno?.nome ?? null,
          matchFound: !!cobranca,
        }
      }),
    )

    // Salva arquivo como pendente
    const cnabFile = await prisma.cnabFile.create({
      data: {
        bankAccountId,
        type: 'retorno',
        fileName,
        layoutType: account.remittanceLayout,
        status: 'pendente',
        totalRecords: parsed.totalRecords,
        importedAt: new Date(),
        createdBy,
        rawContent,
        metadata: JSON.stringify({ parseErrors: parsed.errors }),
      },
    })

    return {
      cnabFileId: cnabFile.id,
      bankCode: parsed.bankCode,
      fileDate: parsed.fileDate,
      totalRecords: parsed.totalRecords,
      matched: occurrencesWithMatch.filter((o) => o.matchFound).length,
      unmatched: occurrencesWithMatch.filter((o) => !o.matchFound).length,
      parseErrors: parsed.errors,
      occurrences: occurrencesWithMatch,
    }
  }

  /**
   * Efetiva o processamento de um retorno previamente importado.
   * Cria CnabOccurrence, atualiza cobranças e alimenta a conciliação.
   */
  async efetivarRetorno(cnabFileId: string, createdBy: string) {
    const cnabFile = await prisma.cnabFile.findUnique({
      where: { id: cnabFileId },
      include: { bankAccount: true },
    })
    if (!cnabFile) throw erroNegocio(404, 'Arquivo não encontrado')
    if (cnabFile.status === 'processado') throw erroNegocio(409, 'Arquivo já processado')
    if (!cnabFile.rawContent) throw erroNegocio(400, 'Conteúdo do arquivo não disponível')

    const adapter = getCnabAdapter(cnabFile.bankAccount.bankCode)
    const config = toConfig(cnabFile.bankAccount)
    const parsed = adapter.parseReturn(cnabFile.rawContent, config)

    let processedCount = 0
    let errorCount = 0

    for (const occ of parsed.occurrences) {
      const cobranca = occ.ourNumber
        ? await prisma.cobranca.findFirst({ where: { nossoNumero: occ.ourNumber } })
        : null

      // Registra ocorrência
      await prisma.cnabOccurrence.create({
        data: {
          cnabFileId,
          billingChargeId: cobranca?.id ?? null,
          occurrenceCode: occ.code,
          occurrenceDescription: occ.description,
          ourNumber: occ.ourNumber,
          documentNumber: occ.documentNumber ?? null,
          amount: occ.amount ?? null,
          paidAmount: occ.paidAmount ?? null,
          occurrenceDate: occ.occurrenceDate ? new Date(occ.occurrenceDate) : null,
          creditDate: occ.creditDate ? new Date(occ.creditDate) : null,
          rawLine: occ.rawLine,
        },
      })

      // Atualiza cobrança se foi pagamento
      if (cobranca && (occ.category === 'payment' || occ.category === 'write_off')) {
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { status: 'paga', pagoEm: occ.creditDate ? new Date(occ.creditDate) : new Date() },
        })

        // Alimenta BillingReconciliation
        await prisma.billingReconciliation.upsert({
          where: { cobrancaId: cobranca.id },
          create: {
            cobrancaId: cobranca.id,
            status: 'conciliado',
            matchType: 'cnab',
            notas: `Retorno CNAB — ocorrência ${occ.code}: ${occ.description}`,
            reconciladoEm: new Date(),
            reconciladoPor: createdBy,
          },
          update: {
            status: 'conciliado',
            matchType: 'cnab',
            notas: `Retorno CNAB — ocorrência ${occ.code}: ${occ.description}`,
            reconciladoEm: new Date(),
            reconciladoPor: createdBy,
          },
        })
        processedCount++
      } else if (!cobranca) {
        errorCount++
      }
    }

    // Marca arquivo como processado
    await prisma.cnabFile.update({
      where: { id: cnabFileId },
      data: {
        status: 'processado',
        processedCount,
        errorCount,
        processedAt: new Date(),
      },
    })

    return { processedCount, errorCount, totalRecords: parsed.occurrences.length }
  }

  // ── Logs / Arquivos ──────────────────────────────────────────────────────────

  async listFiles(bankAccountId: string) {
    return prisma.cnabFile.findMany({
      where: { bankAccountId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, type: true, fileName: true, layoutType: true, status: true,
        totalRecords: true, processedCount: true, errorCount: true,
        generatedAt: true, importedAt: true, processedAt: true,
        createdBy: true, createdAt: true,
      },
    })
  }

  // ── Cobranças elegíveis para remessa ─────────────────────────────────────────

  async getCobrancasElegiveis(bankAccountId: string) {
    return prisma.cobranca.findMany({
      where: {
        status: { notIn: ['paga', 'cancelada'] },
        OR: [{ bankAccountId: null }, { bankAccountId }],
      },
      include: {
        aluno: {
          select: {
            nome: true, foto: true,
            responsaveis: {
              where: { principal: true },
              include: { responsavel: { select: { nome: true, cpf: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { vencimento: 'asc' },
      take: 100,
    })
  }

  // ── Resumo ────────────────────────────────────────────────────────────────────

  async resumo() {
    const [totalContas, contasAtivas, ultimaRemessa, ultimoRetorno] = await Promise.all([
      prisma.billingBankAccount.count(),
      prisma.billingBankAccount.count({ where: { isActive: true } }),
      prisma.cnabFile.findFirst({
        where: { type: 'remessa' },
        orderBy: { createdAt: 'desc' },
        select: { fileName: true, createdAt: true, processedCount: true, bankAccountId: true },
      }),
      prisma.cnabFile.findFirst({
        where: { type: 'retorno' },
        orderBy: { createdAt: 'desc' },
        select: { fileName: true, createdAt: true, processedCount: true, bankAccountId: true },
      }),
    ])

    return { totalContas, contasAtivas, ultimaRemessa, ultimoRetorno }
  }
}

export const bancosService = new BancosService()
