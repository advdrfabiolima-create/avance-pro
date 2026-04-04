import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { bibliotecaService } from './biblioteca.service'
import {
  filtrosExercicioSchema,
  criarExercicioSchema,
  atualizarExercicioSchema,
  gerarIaSchema,
  salvarGeradosSchema,
  revisarExercicioSchema,
} from './biblioteca.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(e: unknown): e is ErroNegocio {
  return typeof e === 'object' && e !== null && 'statusCode' in e && 'message' in e
}

export async function bibliotecaRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/biblioteca — listar com filtros e busca
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = filtrosExercicioSchema.safeParse(request.query)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const data = await bibliotecaService.listar(parsed.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar exercícios' })
    }
  })

  // GET /api/biblioteca/metricas
  app.get('/metricas', { preHandler: autenticar }, async (_request, reply) => {
    try {
      const data = await bibliotecaService.metricas()
      return reply.send({ success: true, data })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao obter métricas' })
    }
  })

  // GET /api/biblioteca/:id
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = await bibliotecaService.buscarPorId(id)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar exercício' })
    }
  })

  // POST /api/biblioteca — criar manual
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const parsed = criarExercicioSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const usuario = (request as any).usuario as { id: string } | undefined
      const data = await bibliotecaService.criar(parsed.data, usuario?.id)
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar exercício' })
    }
  })

  // PUT /api/biblioteca/:id
  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = atualizarExercicioSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const data = await bibliotecaService.atualizar(id, parsed.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar exercício' })
    }
  })

  // POST /api/biblioteca/:id/revisar
  app.post('/:id/revisar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = revisarExercicioSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Ação inválida' })
    try {
      const usuario = (request as any).usuario as { id: string } | undefined
      const data = await bibliotecaService.revisar(id, parsed.data.acao, usuario?.id)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao revisar exercício' })
    }
  })

  // POST /api/biblioteca/:id/duplicar
  app.post('/:id/duplicar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const usuario = (request as any).usuario as { id: string } | undefined
      const data = await bibliotecaService.duplicar(id, usuario?.id)
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao duplicar exercício' })
    }
  })

  // DELETE /api/biblioteca/:id
  app.delete('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await bibliotecaService.excluir(id)
      return reply.send({ success: true })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir exercício' })
    }
  })

  // POST /api/biblioteca/ia/gerar — gerar exercícios com IA/mock
  app.post('/ia/gerar', { preHandler: autenticar }, async (request, reply) => {
    const parsed = gerarIaSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const data = await bibliotecaService.gerarComIA(parsed.data)
      return reply.send({ success: true, data })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao gerar exercícios' })
    }
  })

  // POST /api/biblioteca/ia/salvar — salvar exercícios gerados como rascunho
  app.post('/ia/salvar', { preHandler: autenticar }, async (request, reply) => {
    const parsed = salvarGeradosSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors })
    try {
      const usuario = (request as any).usuario as { id: string } | undefined
      const data = await bibliotecaService.salvarGerados(parsed.data, usuario?.id)
      return reply.status(201).send({ success: true, data })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao salvar exercícios gerados' })
    }
  })
}
