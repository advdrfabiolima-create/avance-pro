import { prisma } from '@kumon-advance/db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

/** Diferença em dias absolutos entre duas datas */
function diffDias(a: Date, b: Date): number {
  return Math.abs(Math.floor((a.getTime() - b.getTime()) / 86_400_000))
}

// ─── Matching ─────────────────────────────────────────────────────────────────
//
// MVP: encontra o melhor MovimentoFinanceiro candidato para uma Cobrança.
//
// Critérios (ordem de peso):
//   1. valor dentro de tolerância de 5%
//   2. data dentro de 10 dias do vencimento (ou pagoEm se existir)
//   3. tipo = 'entrada', status = 'confirmado'
//   4. não vinculado a outra reconciliação já conciliada
//
// Futuro:
//   - Matching por referência/descrição (nossoNumero, pixChave)
//   - Scoring ponderado com aprendizado
//   - Matching automático via webhook/CNAB

async function sugerirMovimento(cobrancaId: string) {
  const cobranca = await prisma.cobranca.findUnique({
    where: { id: cobrancaId },
    select: { valor: true, vencimento: true, pagoEm: true },
  })
  if (!cobranca) return null

  const dataRef = cobranca.pagoEm ?? cobranca.vencimento
  const valorRef = Number(cobranca.valor)
  const tolerancia = valorRef * 0.05

  // IDs já vinculados a conciliações confirmadas (evita double-match)
  const jaUsados = await prisma.billingReconciliation.findMany({
    where: { movimentoId: { not: null }, status: 'conciliado' },
    select: { movimentoId: true },
  })
  const excluir = jaUsados.map((r) => r.movimentoId!).filter(Boolean)

  const movimentos = await prisma.movimentoFinanceiro.findMany({
    where: {
      tipo: 'entrada',
      status: 'confirmado',
      valor: { gte: valorRef - tolerancia, lte: valorRef + tolerancia },
      id: excluir.length > 0 ? { notIn: excluir } : undefined,
    },
    orderBy: { data: 'desc' },
    take: 10,
  })

  // Ordena por proximidade de data
  const candidatos = movimentos
    .map((m) => ({ movimento: m, diffDias: diffDias(new Date(m.data), new Date(dataRef)) }))
    .filter((c) => c.diffDias <= 10)
    .sort((a, b) => a.diffDias - b.diffDias)

  return candidatos[0]?.movimento ?? null
}

// ─── ConciliacaoService ───────────────────────────────────────────────────────

export class ConciliacaoService {
  /**
   * Resumo de indicadores para os cards do topo.
   */
  async resumo() {
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const fimDia = new Date(inicioDia.getTime() + 86_400_000)

    const [pendentes, conciliadasHoje, divergentes, total] = await Promise.all([
      // Cobranças ativas sem reconciliação conciliada/ignorada
      prisma.cobranca.count({
        where: {
          status: { notIn: ['cancelada'] },
          reconciliacoes: {
            none: { status: { in: ['conciliado', 'ignorado'] } },
          },
        },
      }),
      // Conciliadas hoje
      prisma.billingReconciliation.count({
        where: {
          status: 'conciliado',
          reconciladoEm: { gte: inicioDia, lt: fimDia },
        },
      }),
      // Divergentes
      prisma.billingReconciliation.count({
        where: { status: 'divergente' },
      }),
      // Total geral conciliadas
      prisma.billingReconciliation.count({
        where: { status: 'conciliado' },
      }),
    ])

    return { pendentes, conciliadasHoje, divergentes, total }
  }

  /**
   * Lista cobranças pendentes de conciliação, enriquecidas com sugestão de match.
   *
   * Futuro: integrar resultados de webhook / retorno CNAB aqui para
   * matching automático antes de exibir ao usuário.
   */
  async listarPendentes(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [cobrancas, total] = await Promise.all([
      prisma.cobranca.findMany({
        where: {
          status: { notIn: ['cancelada'] },
          reconciliacoes: {
            none: { status: { in: ['conciliado', 'ignorado'] } },
          },
        },
        include: {
          aluno: {
            select: {
              id: true, nome: true, foto: true,
              responsaveis: {
                where: { principal: true },
                include: { responsavel: { select: { nome: true } } },
                take: 1,
              },
            },
          },
          reconciliacoes: {
            take: 1,
            include: {
              movimento: {
                select: { id: true, descricao: true, valor: true, data: true, origem: true },
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { vencimento: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.cobranca.count({
        where: {
          status: { notIn: ['cancelada'] },
          reconciliacoes: {
            none: { status: { in: ['conciliado', 'ignorado'] } },
          },
        },
      }),
    ])

    // Para cada cobrança sem reconciliação, busca sugestão
    const data = await Promise.all(
      cobrancas.map(async (c) => {
        const recExistente = c.reconciliacoes[0]
        let sugestao: Awaited<ReturnType<typeof sugerirMovimento>> = null

        // Só busca sugestão se ainda não tem movimento vinculado
        if (!recExistente?.movimentoId) {
          sugestao = await sugerirMovimento(c.id)
        }

        return {
          ...c,
          reconciliacao: recExistente ?? null,
          sugestao,
        }
      }),
    )

    return { data, total, page, pageSize, totalPaginas: Math.ceil(total / pageSize) }
  }

  /**
   * Confirma conciliação de uma cobrança com um movimento (ou sem movimento, matchType='manual').
   *
   * Webhook-ready: este método também é chamado internamente quando um webhook
   * bancário confirma pagamento. Nesse caso, movimentoId virá do evento do gateway
   * e matchType será 'webhook'.
   *
   * CNAB-ready: ao processar retorno CNAB, chamar este método com matchType='cnab'.
   */
  async confirmar(
    cobrancaId: string,
    opts: {
      movimentoId?: string
      notas?: string
      reconciladoPor?: string
      matchType?: 'auto' | 'manual' | 'imported' | 'webhook' | 'cnab'
    } = {},
  ) {
    const cobranca = await prisma.cobranca.findUnique({ where: { id: cobrancaId } })
    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')
    if (cobranca.status === 'cancelada') throw erroNegocio(409, 'Cobrança cancelada não pode ser conciliada')

    const agora = new Date()

    const reconciliacao = await prisma.billingReconciliation.upsert({
      where: { cobrancaId },
      create: {
        cobrancaId,
        movimentoId: opts.movimentoId ?? null,
        provider: cobranca.provider ?? null,
        status: 'conciliado',
        matchType: opts.matchType ?? (opts.movimentoId ? 'auto' : 'manual'),
        notas: opts.notas ?? null,
        reconciladoEm: agora,
        reconciladoPor: opts.reconciladoPor ?? null,
      },
      update: {
        movimentoId: opts.movimentoId ?? null,
        status: 'conciliado',
        matchType: opts.matchType ?? (opts.movimentoId ? 'auto' : 'manual'),
        notas: opts.notas ?? null,
        reconciladoEm: agora,
        reconciladoPor: opts.reconciladoPor ?? null,
      },
      include: {
        cobranca: { select: { id: true, valor: true, status: true } },
        movimento: { select: { id: true, descricao: true, valor: true } },
      },
    })

    // Atualiza status da cobrança para 'paga' se ainda não estava
    if (cobranca.status !== 'paga') {
      await prisma.cobranca.update({
        where: { id: cobrancaId },
        data: { status: 'paga', pagoEm: agora },
      })
    }

    return reconciliacao
  }

  /**
   * Marca uma cobrança como paga manualmente, sem movimento vinculado.
   * Cria um MovimentoFinanceiro de entrada automaticamente.
   */
  async pagarManual(
    cobrancaId: string,
    opts: { notas?: string; reconciladoPor?: string } = {},
  ) {
    const cobranca = await prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      include: {
        aluno: { select: { nome: true } },
      },
    })
    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')
    if (cobranca.status === 'cancelada') throw erroNegocio(409, 'Cobrança cancelada')
    if (cobranca.status === 'paga') throw erroNegocio(409, 'Cobrança já está paga')

    const agora = new Date()

    // Cria movimento de entrada automático
    const movimento = await prisma.movimentoFinanceiro.create({
      data: {
        tipo: 'entrada',
        origem: 'mensalidade',
        descricao: cobranca.descricao ?? `Pagamento manual — ${cobranca.aluno.nome}`,
        valor: cobranca.valor,
        data: agora,
        status: 'confirmado',
        observacao: opts.notas ?? 'Registrado via conciliação manual',
      },
    })

    // Concilia e atualiza cobrança em paralelo
    const [reconciliacao] = await Promise.all([
      this.confirmar(cobrancaId, {
        movimentoId: movimento.id,
        notas: opts.notas,
        reconciladoPor: opts.reconciladoPor,
        matchType: 'manual',
      }),
      prisma.cobranca.update({
        where: { id: cobrancaId },
        data: { status: 'paga', pagoEm: agora },
      }),
    ])

    return reconciliacao
  }

  /**
   * Ignora a sugestão de conciliação (a cobrança pode ser revisitada depois).
   * Não apaga dados — apenas registra que foi ignorada.
   */
  async ignorar(cobrancaId: string, opts: { notas?: string; reconciladoPor?: string } = {}) {
    const cobranca = await prisma.cobranca.findUnique({ where: { id: cobrancaId } })
    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')

    return prisma.billingReconciliation.upsert({
      where: { cobrancaId },
      create: {
        cobrancaId,
        provider: cobranca.provider ?? null,
        status: 'ignorado',
        matchType: 'manual',
        notas: opts.notas ?? null,
        reconciladoPor: opts.reconciladoPor ?? null,
      },
      update: {
        status: 'ignorado',
        notas: opts.notas ?? null,
        reconciladoPor: opts.reconciladoPor ?? null,
        reconciladoEm: null,
      },
    })
  }

  /**
   * Histórico das últimas reconciliações realizadas.
   */
  async historico(limit = 15) {
    return prisma.billingReconciliation.findMany({
      where: { status: { in: ['conciliado', 'ignorado', 'divergente'] } },
      orderBy: { atualizadoEm: 'desc' },
      take: limit,
      include: {
        cobranca: {
          select: {
            id: true, valor: true, descricao: true, status: true,
            aluno: { select: { id: true, nome: true, foto: true } },
          },
        },
        movimento: {
          select: { id: true, descricao: true, valor: true, data: true },
        },
      },
    })
  }

  /**
   * Ponto de entrada para webhooks de gateways.
   *
   * WEBHOOK-READY: quando um gateway (Asaas, Inter, Bradesco) confirmar pagamento
   * via webhook POST /conciliacao/webhook/:provider, chamar este método.
   *
   * O fluxo esperado:
   *   1. Gateway envia evento de pagamento confirmado
   *   2. Buscamos a cobrança pelo providerChargeId (asaasId)
   *   3. Chamamos confirmar() com matchType='webhook'
   *   4. Respondemos 200 para o gateway
   *
   * Implementação completa: aguarda integração ativa com cada provider.
   */
  async processarWebhook(provider: string, payload: unknown): Promise<void> {
    // TODO: implementar parsing por provider
    // AsaasWebhook: payload.payment.id → buscar cobrança por asaasId
    // InterWebhook: payload.cobranca.nossoNumero → buscar por nossoNumero
    // BradescoWebhook: similar ao Inter

    void provider
    void payload
    throw erroNegocio(501, `Webhook ${provider} não implementado ainda`)
  }

  /**
   * Processa arquivo importado (CSV ou retorno CNAB).
   *
   * CNAB-READY: ao implementar o parser CNAB 400/240, chamar confirmar() para
   * cada linha do tipo "liquidação" encontrada no arquivo de retorno.
   *
   * CSV: formato esperado: cobrancaId,movimentoId,notas (cabeçalho obrigatório)
   */
  async processarImportacao(
    _tipo: 'csv' | 'cnab240' | 'cnab400',
    _conteudo: string,
    _usuario: string,
  ): Promise<{ processados: number; erros: string[] }> {
    // TODO: implementar parser CSV e CNAB
    throw erroNegocio(501, 'Importação automática em desenvolvimento. Use a conciliação manual por enquanto.')
  }
}

export const conciliacaoService = new ConciliacaoService()
