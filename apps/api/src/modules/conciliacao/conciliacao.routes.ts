import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { conciliacaoService } from './conciliacao.service'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function conciliacaoRoutes(app: FastifyInstance): Promise<void> {
  // GET /resumo — indicadores para os cards do topo
  app.get('/resumo', { preHandler: autenticar }, async (_req, reply) => {
    try {
      const data = await conciliacaoService.resumo()
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar resumo' })
    }
  })

  // GET /pendentes — lista cobranças pendentes com sugestões
  app.get('/pendentes', { preHandler: autenticar }, async (request, reply) => {
    const { page = '1', pageSize = '20' } = request.query as { page?: string; pageSize?: string }
    try {
      const data = await conciliacaoService.listarPendentes(Number(page), Number(pageSize))
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar pendentes' })
    }
  })

  // GET /historico — últimas reconciliações realizadas
  app.get('/historico', { preHandler: autenticar }, async (_req, reply) => {
    try {
      const data = await conciliacaoService.historico()
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar histórico' })
    }
  })

  // POST /:id/confirmar — confirma conciliação (com ou sem movimento)
  app.post('/:id/confirmar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = (request.body ?? {}) as {
      movimentoId?: string
      notas?: string
      matchType?: 'auto' | 'manual'
    }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const data = await conciliacaoService.confirmar(id, { ...body, reconciladoPor: usuario })
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao confirmar conciliação' })
    }
  })

  // POST /:id/pagar-manual — marca como pago manualmente e gera movimento
  app.post('/:id/pagar-manual', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { notas } = (request.body ?? {}) as { notas?: string }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const data = await conciliacaoService.pagarManual(id, { notas, reconciladoPor: usuario })
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao registrar pagamento manual' })
    }
  })

  // POST /:id/ignorar — ignora sugestão (revisável depois)
  app.post('/:id/ignorar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { notas } = (request.body ?? {}) as { notas?: string }
    const usuario = (request as any).user?.nome ?? 'sistema'
    try {
      const data = await conciliacaoService.ignorar(id, { notas, reconciladoPor: usuario })
      return reply.send({ success: true, data })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro ao ignorar conciliação' })
    }
  })

  // POST /webhook/:provider — recebe confirmação automática de pagamento
  // WEBHOOK-READY: implementar parsing por provider quando necessário
  app.post('/webhook/:provider', async (request, reply) => {
    const { provider } = request.params as { provider: string }
    try {
      await conciliacaoService.processarWebhook(provider, request.body)
      return reply.send({ received: true })
    } catch (e) {
      if (isErroNegocio(e)) return reply.status(e.statusCode).send({ success: false, error: e.message })
      return reply.status(500).send({ success: false, error: 'Erro no webhook' })
    }
  })
}
