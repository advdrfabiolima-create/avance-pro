import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { cobrancaService } from './cobrancas.service'
import { criarCobrancaSchema, atualizarCobrancaSchema, filtrosCobrancaSchema } from './cobrancas.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function cobrancasRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarCobrancaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const cobranca = await cobrancaService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar cobrança' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosCobrancaSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const resposta = await cobrancaService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar cobranças' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const cobranca = await cobrancaService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar cobrança' })
    }
  })

  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarCobrancaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const cobranca = await cobrancaService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar cobrança' })
    }
  })

  app.patch('/:id/pagar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { pagoEm } = (request.body ?? {}) as { pagoEm?: string }
    try {
      const cobranca = await cobrancaService.registrarPagamento(id, pagoEm ? new Date(pagoEm) : new Date())
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao registrar pagamento da cobrança' })
    }
  })

  app.patch('/:id/cancelar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const cobranca = await cobrancaService.cancelar(id)
      return reply.status(200).send({ success: true, data: cobranca })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao cancelar cobrança' })
    }
  })
}
