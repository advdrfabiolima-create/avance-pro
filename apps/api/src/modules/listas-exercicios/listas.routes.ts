import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { listasService } from './listas.service'
import { criarListaSchema, atualizarListaSchema, filtrosListaSchema, adicionarItemListaSchema, importarTrilhaSchema, reordenarListaSchema } from './listas.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function listasExerciciosRoutes(app: FastifyInstance): Promise<void> {

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = filtrosListaSchema.safeParse(request.query)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Parâmetros inválidos' })
    try {
      return reply.send({ success: true, data: await listasService.listar(parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar listas' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await listasService.buscarPorId(id) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar lista' })
    }
  })

  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = criarListaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const usuario = (request as any).usuario as { id: string } | undefined
      return reply.status(201).send({ success: true, data: await listasService.criar(parsed.data, usuario?.id) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar lista' })
    }
  })

  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = atualizarListaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      return reply.send({ success: true, data: await listasService.atualizar(id, parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar lista' })
    }
  })

  app.post('/:id/publicar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      return reply.send({ success: true, data: await listasService.publicar(id) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao publicar lista' })
    }
  })

  app.delete('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await listasService.excluir(id)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir lista' })
    }
  })

  app.post('/:id/itens', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = adicionarItemListaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      return reply.status(201).send({ success: true, data: await listasService.adicionarItem(id, parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao adicionar exercício' })
    }
  })

  app.delete('/:id/itens/:exercicioId', { preHandler: autenticar }, async (request, reply) => {
    const { id, exercicioId } = request.params as { id: string; exercicioId: string }
    try {
      await listasService.removerItem(id, exercicioId)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao remover exercício' })
    }
  })

  app.post('/:id/importar-trilha', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = importarTrilhaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      return reply.send({ success: true, data: await listasService.importarDeTrilha(id, parsed.data) })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao importar trilha' })
    }
  })

  app.put('/:id/itens/reordenar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = reordenarListaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    try {
      await listasService.reordenarItens(id, parsed.data)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao reordenar itens' })
    }
  })
}
