import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { exerciciosService } from './exercicios.service'
import {
  criarExercicioSchema,
  atualizarExercicioSchema,
  criarQuestaoSchema,
  filtrosExercicioSchema,
} from './exercicios.schema'

function isErroNegocio(err: unknown): err is { statusCode: number; message: string } {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function exerciciosRoutes(app: FastifyInstance): Promise<void> {
  // GET / — listar exercícios
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosExercicioSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await exerciciosService.listar(resultado.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar exercícios' })
    }
  })

  // GET /:id — buscar por id
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = await exerciciosService.buscarPorId(id)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar exercício' })
    }
  })

  // POST / — criar exercício
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarExercicioSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await exerciciosService.criar(resultado.data)
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar exercício' })
    }
  })

  // PUT /:id — atualizar exercício
  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarExercicioSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await exerciciosService.atualizar(id, resultado.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar exercício' })
    }
  })

  // DELETE /:id — excluir exercício
  app.delete('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await exerciciosService.excluir(id)
      return reply.send({ success: true, data: { message: 'Exercício excluído' } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir exercício' })
    }
  })

  // POST /:id/questoes — adicionar questão
  app.post('/:id/questoes', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = criarQuestaoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await exerciciosService.adicionarQuestao(id, resultado.data)
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao adicionar questão' })
    }
  })

  // PUT /:id/questoes/:questaoId — atualizar questão
  app.put('/:id/questoes/:questaoId', { preHandler: autenticar }, async (request, reply) => {
    const { id, questaoId } = request.params as { id: string; questaoId: string }
    const resultado = criarQuestaoSchema.partial().safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await exerciciosService.atualizarQuestao(id, questaoId, resultado.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar questão' })
    }
  })

  // DELETE /:id/questoes/:questaoId — remover questão
  app.delete('/:id/questoes/:questaoId', { preHandler: autenticar }, async (request, reply) => {
    const { id, questaoId } = request.params as { id: string; questaoId: string }
    try {
      await exerciciosService.removerQuestao(id, questaoId)
      return reply.send({ success: true, data: { message: 'Questão removida' } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao remover questão' })
    }
  })
}
