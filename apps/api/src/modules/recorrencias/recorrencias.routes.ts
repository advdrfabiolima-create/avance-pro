import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { recorrenciaService } from './recorrencias.service'
import { criarRecorrenciaSchema, atualizarRecorrenciaSchema } from './recorrencias.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function recorrenciasRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarRecorrenciaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const rec = await recorrenciaService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: rec })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar recorrência' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const { ativo } = request.query as { ativo?: string }
    try {
      const lista = await recorrenciaService.listar(ativo === 'true')
      return reply.status(200).send({ success: true, data: lista })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar recorrências' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const rec = await recorrenciaService.buscarPorId(id)
      const proximas = recorrenciaService.simularProximasCobrancas(rec)
      return reply.status(200).send({ success: true, data: { ...rec, proximasCobrancas: proximas } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar recorrência' })
    }
  })

  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarRecorrenciaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const rec = await recorrenciaService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: rec })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar recorrência' })
    }
  })
}
