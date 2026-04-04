// ─── Billing Core ─────────────────────────────────────────────────────────────
// Ponto central de criação e gestão de cobranças.
// O sistema NÃO deve acoplar diretamente a nenhum provider externo.
// Todo fluxo passa por aqui, que roteia para o adapter correto.

import { prisma } from '@kumon-advance/db'
import type { BillingProviderAdapter, CreateChargeParams, ChargeResult, BillingProvider } from './billing.types'
import { asaasAdapter } from './adapters/asaas.adapter'
import { interAdapter } from './adapters/inter.adapter'
import { bradescoAdapter } from './adapters/bradesco.adapter'

// ─── Registry de adapters ─────────────────────────────────────────────────────

const ADAPTERS: Record<BillingProvider, BillingProviderAdapter> = {
  asaas: asaasAdapter,
  inter: interAdapter,
  bradesco: bradescoAdapter,
  manual: {
    // Provider "manual" — sem envio externo, apenas registro interno
    async createCharge(): Promise<ChargeResult> {
      throw new Error('Provider manual não gera cobranças externas.')
    },
    async getCharge(): Promise<ChargeResult> {
      throw new Error('Provider manual não tem integração externa.')
    },
    async cancelCharge(): Promise<void> {
      // Cancelamento manual não precisa de chamada externa
    },
  },
}

// ─── BillingCore ──────────────────────────────────────────────────────────────

export class BillingCore {
  /**
   * Retorna o adapter do provider configurado no banco.
   * Lança erro claro se nenhum gateway estiver ativo.
   */
  async getAdapter(): Promise<{ adapter: BillingProviderAdapter; provider: BillingProvider }> {
    const config = await prisma.configGateway.findFirst({ where: { ativo: true } })
    if (!config) {
      throw { statusCode: 422, message: 'Nenhum gateway de pagamento configurado. Acesse Financeiro → Configurações.' }
    }

    const provider = config.tipo as BillingProvider
    const adapter = ADAPTERS[provider]
    if (!adapter) {
      throw { statusCode: 422, message: `Provider "${config.tipo}" não reconhecido. Verifique as configurações.` }
    }

    return { adapter, provider }
  }

  /**
   * Envia uma cobrança existente pelo provider ativo.
   * Atualiza o registro Cobranca com os dados retornados.
   */
  async enviarCobranca(
    cobrancaId: string,
    paymentMethod: 'pix' | 'boleto',
  ): Promise<ChargeResult & { provider: BillingProvider }> {
    // Busca cobrança com dados do aluno e responsável
    const cobranca = await prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      include: {
        aluno: {
          include: {
            responsaveis: {
              where: { principal: true },
              include: { responsavel: true },
            },
          },
        },
      },
    })

    if (!cobranca) throw { statusCode: 404, message: 'Cobrança não encontrada.' }
    if (cobranca.status === 'paga') throw { statusCode: 409, message: 'Cobrança já foi paga.' }
    if (cobranca.status === 'cancelada') throw { statusCode: 409, message: 'Cobrança cancelada não pode ser enviada.' }

    const responsavelPrincipal = cobranca.aluno.responsaveis[0]?.responsavel

    const params: CreateChargeParams = {
      externalId: cobranca.id,
      payerName: responsavelPrincipal?.nome ?? cobranca.aluno.nome,
      payerDocument: responsavelPrincipal?.cpf ?? undefined,
      payerEmail: responsavelPrincipal?.email ?? undefined,
      payerPhone: responsavelPrincipal?.telefone ?? undefined,
      amount: Number(cobranca.valor),
      dueDate: cobranca.vencimento.toISOString().split('T')[0]!,
      description: cobranca.descricao ?? `Mensalidade — ${cobranca.aluno.nome}`,
      paymentMethod,
    }

    const { adapter, provider } = await this.getAdapter()
    const result = await adapter.createCharge(params)

    // Persiste retorno do provider na cobrança
    await prisma.cobranca.update({
      where: { id: cobrancaId },
      data: {
        asaasId: result.providerChargeId,
        provider,
        status: 'enviada',
        ...(result.boletoUrl && { boletoUrl: result.boletoUrl }),
        ...(result.linhaDigitavel && { linhaDigitavel: result.linhaDigitavel }),
        ...(result.pixQrCode && { pixQrCode: result.pixQrCode }),
        ...(result.pixChave && { pixChave: result.pixChave }),
      },
    })

    return { ...result, provider }
  }

  /**
   * Cancela uma cobrança no provider e atualiza o status interno.
   */
  async cancelarCobranca(cobrancaId: string): Promise<void> {
    const cobranca = await prisma.cobranca.findUnique({ where: { id: cobrancaId } })
    if (!cobranca) throw { statusCode: 404, message: 'Cobrança não encontrada.' }

    // Se foi enviada ao provider, cancela lá também
    if (cobranca.asaasId && cobranca.status === 'enviada') {
      try {
        const { adapter } = await this.getAdapter()
        await adapter.cancelCharge(cobranca.asaasId)
      } catch {
        // Log mas não bloqueia — pode já ter sido cancelada no provider
      }
    }

    await prisma.cobranca.update({
      where: { id: cobrancaId },
      data: { status: 'cancelada' },
    })
  }

  /**
   * Para adicionar um novo provider:
   * 1. Criar o adapter em adapters/<nome>.adapter.ts implementando BillingProviderAdapter
   * 2. Importar e adicionar em ADAPTERS acima
   * 3. Adicionar 'tipo' = '<nome>' como opção em ConfigGateway
   * 4. Adicionar a opção na UI de Configurações
   */
}

export const billingCore = new BillingCore()
