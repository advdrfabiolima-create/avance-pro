import { prisma } from '@kumon-advance/db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

/**
 * Renderiza um template substituindo variáveis {{var}}.
 * Variáveis suportadas: nome_aluno, nome_responsavel, valor, vencimento,
 * link_pagamento, linha_digitavel, instituicao.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

/** Retorna data local YYYY-MM-DD sem conversão de fuso */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Adiciona dias a uma data base (sem alterar horas) */
function addDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

// ─── ReguaCobrancaService ─────────────────────────────────────────────────────

export class ReguaCobrancaService {
  // ── Regras ──────────────────────────────────────────────────────────────────

  async listRules() {
    return prisma.billingRule.findMany({ orderBy: [{ eventType: 'asc' }, { offsetDays: 'asc' }] })
  }

  async createRule(data: {
    name: string
    eventType: string
    offsetDays: number
    channel: string
    template: string
    isActive?: boolean
  }) {
    return prisma.billingRule.create({ data: { ...data, isActive: data.isActive ?? true } })
  }

  async updateRule(
    id: string,
    data: Partial<{
      name: string
      eventType: string
      offsetDays: number
      channel: string
      template: string
      isActive: boolean
    }>,
  ) {
    const rule = await prisma.billingRule.findUnique({ where: { id } })
    if (!rule) throw erroNegocio(404, 'Regra não encontrada')
    return prisma.billingRule.update({ where: { id }, data })
  }

  async toggleRule(id: string) {
    const rule = await prisma.billingRule.findUnique({ where: { id } })
    if (!rule) throw erroNegocio(404, 'Regra não encontrada')
    return prisma.billingRule.update({ where: { id }, data: { isActive: !rule.isActive } })
  }

  async deleteRule(id: string) {
    const rule = await prisma.billingRule.findUnique({ where: { id } })
    if (!rule) throw erroNegocio(404, 'Regra não encontrada')
    return prisma.billingRule.delete({ where: { id } })
  }

  // ── Fila do dia ─────────────────────────────────────────────────────────────

  /**
   * Calcula as cobranças elegíveis para cada regra ativa HOJE.
   *
   * Lógica de elegibilidade:
   *  - Cobrança não cancelada, não paga
   *  - Para regra "before  N": vencimento = hoje + N dias
   *  - Para regra "on_due"  : vencimento = hoje
   *  - Para regra "after  N": vencimento = hoje - N dias
   *  - Não existe BillingActionLog com mesma cobrancaId + billingRuleId + status != 'erro'
   *    (evita duplicidade — reenvio manual permite re-trigger)
   *
   * SCHEDULER-READY: este método pode ser chamado por um cron job diário (ex: 08:00)
   * para disparar ações automáticas. No MVP, o front chama e exibe a fila para o usuário.
   */
  async getFilaHoje() {
    const hoje = new Date()
    const hojeStr = toDateStr(hoje)

    const rules = await prisma.billingRule.findMany({ where: { isActive: true } })

    const resultado: Array<{
      rule: (typeof rules)[0]
      cobrancas: Array<{
        id: string
        valor: string
        vencimento: string
        descricao: string | null
        aluno: { id: string; nome: string; foto: string | null }
        responsavel: string | null
        telefone: string | null
        jaAcionada: boolean
      }>
    }> = []

    for (const rule of rules) {
      let dataAlvo: Date

      if (rule.eventType === 'before') {
        dataAlvo = addDias(hoje, rule.offsetDays)
      } else if (rule.eventType === 'on_due') {
        dataAlvo = hoje
      } else {
        // after
        dataAlvo = addDias(hoje, -rule.offsetDays)
      }

      const dataAlvoStr = toDateStr(dataAlvo)

      // Cobranças com vencimento na data alvo, não pagas/canceladas
      const cobrancas = await prisma.cobranca.findMany({
        where: {
          vencimento: {
            gte: new Date(`${dataAlvoStr}T00:00:00.000Z`),
            lt: new Date(`${dataAlvoStr}T23:59:59.999Z`),
          },
          status: { notIn: ['paga', 'cancelada'] },
        },
        include: {
          aluno: {
            select: {
              id: true,
              nome: true,
              foto: true,
              responsaveis: {
                where: { principal: true },
                include: { responsavel: { select: { nome: true, telefone: true } } },
                take: 1,
              },
            },
          },
          actionLogs: {
            where: { billingRuleId: rule.id, status: { not: 'erro' } },
            take: 1,
          },
        },
        take: 50,
      })

      if (cobrancas.length === 0) continue

      resultado.push({
        rule,
        cobrancas: cobrancas.map((c) => ({
          id: c.id,
          valor: c.valor.toString(),
          vencimento: toDateStr(new Date(c.vencimento)),
          descricao: c.descricao ?? null,
          aluno: { id: c.aluno.id, nome: c.aluno.nome, foto: c.aluno.foto ?? null },
          responsavel: c.aluno.responsaveis[0]?.responsavel.nome ?? null,
          telefone: c.aluno.responsaveis[0]?.responsavel.telefone ?? null,
          jaAcionada: c.actionLogs.length > 0,
        })),
      })
    }

    return resultado
  }

  // ── Template rendering ───────────────────────────────────────────────────────

  /**
   * Resolve variáveis do template buscando dados da cobrança no banco.
   *
   * Variáveis: nome_aluno, nome_responsavel, valor, vencimento,
   *            link_pagamento, linha_digitavel, instituicao
   */
  async renderTemplateForCharge(template: string, cobrancaId: string): Promise<string> {
    const cobranca = await prisma.cobranca.findUnique({
      where: { id: cobrancaId },
      include: {
        aluno: {
          select: {
            nome: true,
            responsaveis: {
              where: { principal: true },
              include: { responsavel: { select: { nome: true } } },
              take: 1,
            },
          },
        },
      },
    })

    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')

    const vars: Record<string, string> = {
      nome_aluno: cobranca.aluno.nome,
      nome_responsavel: cobranca.aluno.responsaveis[0]?.responsavel.nome ?? cobranca.aluno.nome,
      valor: Number(cobranca.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      vencimento: new Date(cobranca.vencimento).toLocaleDateString('pt-BR'),
      link_pagamento: cobranca.boletoUrl ?? cobranca.pixChave ?? '(link não disponível)',
      linha_digitavel: cobranca.linhaDigitavel ?? '(não disponível)',
      instituicao: cobranca.provider ?? 'Kumon',
    }

    return renderTemplate(template, vars)
  }

  // ── Ações ───────────────────────────────────────────────────────────────────

  /**
   * Registra que uma ação da régua foi disparada (assistida ou automática).
   *
   * WEBHOOK-READY: quando a API real do WhatsApp confirmar entrega, chamar
   * logAction com status='enviado' e metadata com o messageId do provider.
   *
   * AUTOMAÇÃO-READY: ao implementar cron, chamar triggerRuleBatch() que chama
   * este método para cada cobrança elegível.
   */
  async logAction(data: {
    cobrancaId: string
    billingRuleId?: string | null
    actionType: string
    channel: string
    messageSnapshot?: string
    status?: string
    triggeredBy?: string
    metadata?: Record<string, unknown>
  }) {
    const cobranca = await prisma.cobranca.findUnique({ where: { id: data.cobrancaId } })
    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')

    return prisma.billingActionLog.create({
      data: {
        cobrancaId: data.cobrancaId,
        billingRuleId: data.billingRuleId ?? null,
        actionType: data.actionType,
        channel: data.channel,
        messageSnapshot: data.messageSnapshot ?? null,
        status: data.status ?? 'enviado',
        triggeredBy: data.triggeredBy ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    })
  }

  // ── Histórico ────────────────────────────────────────────────────────────────

  async historicoRecente(limit = 20) {
    return prisma.billingActionLog.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      include: {
        cobranca: {
          select: {
            id: true, valor: true, vencimento: true, descricao: true,
            aluno: { select: { id: true, nome: true, foto: true } },
          },
        },
        billingRule: { select: { id: true, name: true } },
      },
    })
  }

  async historicoPorCobranca(cobrancaId: string) {
    return prisma.billingActionLog.findMany({
      where: { cobrancaId },
      orderBy: { triggeredAt: 'desc' },
      include: { billingRule: { select: { id: true, name: true } } },
    })
  }

  // ── Resumo / KPIs ─────────────────────────────────────────────────────────

  async resumo() {
    const hoje = new Date()
    const hojeStr = toDateStr(hoje)
    const amanha = addDias(hoje, 1)
    const amanhaStr = toDateStr(amanha)
    const em3Dias = addDias(hoje, 3)
    const em3DiasStr = toDateStr(em3Dias)
    const ha5Dias = addDias(hoje, -5)
    const ha5DiasStr = toDateStr(ha5Dias)

    const [
      regrasAtivas,
      vencendoHoje,
      vencendoEm3Dias,
      atrasoCritico,
      acoesHoje,
    ] = await Promise.all([
      prisma.billingRule.count({ where: { isActive: true } }),
      // cobranças vencendo hoje
      prisma.cobranca.count({
        where: {
          vencimento: {
            gte: new Date(`${hojeStr}T00:00:00.000Z`),
            lt: new Date(`${amanhaStr}T00:00:00.000Z`),
          },
          status: { notIn: ['paga', 'cancelada'] },
        },
      }),
      // cobranças vencendo nos próximos 3 dias (incluindo hoje)
      prisma.cobranca.count({
        where: {
          vencimento: {
            gte: new Date(`${hojeStr}T00:00:00.000Z`),
            lt: new Date(`${em3DiasStr}T23:59:59.999Z`),
          },
          status: { notIn: ['paga', 'cancelada'] },
        },
      }),
      // cobranças com mais de 5 dias de atraso
      prisma.cobranca.count({
        where: {
          vencimento: { lt: new Date(`${ha5DiasStr}T00:00:00.000Z`) },
          status: { notIn: ['paga', 'cancelada'] },
        },
      }),
      // ações registradas hoje
      prisma.billingActionLog.count({
        where: {
          triggeredAt: {
            gte: new Date(`${hojeStr}T00:00:00.000Z`),
            lt: new Date(`${amanhaStr}T00:00:00.000Z`),
          },
        },
      }),
    ])

    return {
      regrasAtivas,
      vencendoHoje,
      vencendoEm3Dias,
      atrasoCritico,
      acoesHoje,
    }
  }
}

export const reguaCobrancaService = new ReguaCobrancaService()
