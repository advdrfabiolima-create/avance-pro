import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { trilhasService } from './trilhas.service'
import { criarTrilhaSchema, atualizarTrilhaSchema, filtrosTrilhaSchema, adicionarItemSchema, reordenarItensSchema } from './trilhas.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function trilhasRoutes(app: FastifyInstance): Promise<void> {

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = filtrosTrilhaSchema.safeParse(request.query)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Parâmetros inválidos' })
    try {
      return reply.send({ success: true, data: await trilhasService.listar(parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar trilhas' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await trilhasService.buscarPorId(id) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar trilha' })
    }
  })

  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = criarTrilhaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      return reply.status(201).send({ success: true, data: await trilhasService.criar(parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar trilha' })
    }
  })

  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = atualizarTrilhaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      return reply.send({ success: true, data: await trilhasService.atualizar(id, parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar trilha' })
    }
  })

  app.delete('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await trilhasService.excluir(id)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir trilha' })
    }
  })

  // Itens da trilha
  app.post('/:id/itens', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = adicionarItemSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      return reply.status(201).send({ success: true, data: await trilhasService.adicionarItem(id, parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao adicionar item' })
    }
  })

  app.delete('/:id/itens/:exercicioId', { preHandler: autenticar }, async (request, reply) => {
    const { id, exercicioId } = request.params as { id: string; exercicioId: string }
    try {
      await trilhasService.removerItem(id, exercicioId)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao remover item' })
    }
  })

  app.put('/:id/itens/reordenar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = reordenarItensSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      await trilhasService.reordenarItens(id, parsed.data)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao reordenar itens' })
    }
  })
}
