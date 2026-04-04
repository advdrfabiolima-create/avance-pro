import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { reguaCobrancaService } from './regua-cobranca.service'
import { runBillingAutomation } from './billing-automation.scheduler'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function reguaCobrancaRoutes(app: FastifyInstance): Promise<void> {
  // GET /resumo
  app.get('/resumo', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.resumo() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar resumo' })
    }
  })

  // GET /regras
  app.get('/regras', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.listRules() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar regras' })
    }
  })

  // POST /regras
  app.post('/regras', { preHandler: apenasAdmin }, async (request, reply) => {
    const body = request.body as {
      name: string; eventType: string; offsetDays: number
      channel: string; template: string; isActive?: boolean
    }
    try {
      return reply.status(201).send({ success: true, data: await reguaCobrancaService.createRule(body) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar regra' })
    }
  })

  // PUT /regras/:id
  app.put('/regras/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown>
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.updateRule(id, body as any) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar regra' })
    }
  })

  // PATCH /regras/:id/toggle
  app.patch('/regras/:id/toggle', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.toggleRule(id) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao alternar regra' })
    }
  })

  // DELETE /regras/:id
  app.delete('/regras/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await reguaCobrancaService.deleteRule(id)
      return reply.send({ success: true })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao remover regra' })
    }
  })

  // GET /fila-hoje
  app.get('/fila-hoje', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.getFilaHoje() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao calcular fila' })
    }
  })

  // POST /render-template — preview de template com dados reais de uma cobrança
  app.post('/render-template', { preHandler: autenticar }, async (request, reply) => {
    const { template, cobrancaId } = request.body as { template: string; cobrancaId: string }
    try {
      const rendered = await reguaCobrancaService.renderTemplateForCharge(template, cobrancaId)
      return reply.send({ success: true, data: { rendered } })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao renderizar template' })
    }
  })

  // POST /acoes — registra uma ação disparada (WhatsApp assistido, alerta manual, etc.)
  app.post('/acoes', { preHandler: autenticar }, async (request, reply) => {
    const body = request.body as {
      cobrancaId: string
      billingRuleId?: string
      actionType: string
      channel: string
      messageSnapshot?: string
      status?: string
      metadata?: Record<string, unknown>
    }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const log = await reguaCobrancaService.logAction({ ...body, triggeredBy: usuario })
      return reply.status(201).send({ success: true, data: log })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao registrar ação' })
    }
  })

  // GET /historico — histórico recente de ações
  app.get('/historico', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.historicoRecente() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar histórico' })
    }
  })

  // GET /historico/:cobrancaId — histórico de ações de uma cobrança específica
  app.get('/historico/:cobrancaId', { preHandler: autenticar }, async (request, reply) => {
    const { cobrancaId } = request.params as { cobrancaId: string }
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.historicoPorCobranca(cobrancaId) })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar histórico da cobrança' })
    }
  })

  // GET /automation-status — status da automação + KPIs
  app.get('/automation-status', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.automationStatus() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar status da automação' })
    }
  })

  // GET /automation-runs — últimas execuções
  app.get('/automation-runs', { preHandler: autenticar }, async (_req, reply) => {
    try {
      return reply.send({ success: true, data: await reguaCobrancaService.listAutomationRuns() })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar execuções' })
    }
  })

  // POST /run-automation — execução manual sob demanda (admin)
  app.post('/run-automation', { preHandler: apenasAdmin }, async (_req, reply) => {
    try {
      const result = await runBillingAutomation()
      return reply.send({ success: true, data: result })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao executar automação' })
    }
  })
}
