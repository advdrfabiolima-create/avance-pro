import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { notaFiscalService } from './notas-fiscais.service'
import { criarNotaFiscalSchema, atualizarNotaFiscalSchema, filtrosNotaFiscalSchema } from './notas-fiscais.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function notasFiscaisRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarNotaFiscalSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const nf = await notaFiscalService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: nf })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar nota fiscal' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosNotaFiscalSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const resposta = await notaFiscalService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar notas fiscais' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const nf = await notaFiscalService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: nf })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar nota fiscal' })
    }
  })

  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarNotaFiscalSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const nf = await notaFiscalService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: nf })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar nota fiscal' })
    }
  })
}
