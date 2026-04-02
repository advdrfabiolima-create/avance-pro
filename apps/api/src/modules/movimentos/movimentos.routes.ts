import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { movimentoService } from './movimentos.service'
import { criarMovimentoSchema, atualizarMovimentoSchema, filtrosMovimentoSchema } from './movimentos.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function movimentosRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarMovimentoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const mov = await movimentoService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: mov })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar movimento' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosMovimentoSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const resposta = await movimentoService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar movimentos' })
    }
  })

  app.get('/resumo', { preHandler: autenticar }, async (request, reply) => {
    const { dataInicio, dataFim } = request.query as { dataInicio?: string; dataFim?: string }
    const hoje = new Date()
    const inicio = dataInicio ?? new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10)
    const fim = dataFim ?? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10)
    try {
      const resumo = await movimentoService.resumoPorPeriodo(inicio, fim)
      return reply.status(200).send({ success: true, data: resumo })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao calcular resumo' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const mov = await movimentoService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: mov })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar movimento' })
    }
  })

  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarMovimentoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const mov = await movimentoService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: mov })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar movimento' })
    }
  })

  app.delete('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await movimentoService.excluir(id)
      return reply.status(200).send({ success: true, data: { message: 'Movimento excluído com sucesso' } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir movimento' })
    }
  })
}
