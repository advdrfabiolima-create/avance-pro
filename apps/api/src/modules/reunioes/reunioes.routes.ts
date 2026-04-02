import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { reuniaoService } from './reunioes.service'
import { criarReuniaoSchema, atualizarReuniaoSchema, filtrosReuniaoSchema } from './reunioes.schema'

interface ErroNegocio { statusCode: number; message: string }
function isErroNegocio(err: unknown): err is ErroNegocio {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function reunioesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarReuniaoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const reuniao = await reuniaoService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: reuniao })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao criar reunião' })
    }
  })

  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosReuniaoSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const resposta = await reuniaoService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar reuniões' })
    }
  })

  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const reuniao = await reuniaoService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: reuniao })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar reunião' })
    }
  })

  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = atualizarReuniaoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const reuniao = await reuniaoService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: reuniao })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar reunião' })
    }
  })

  app.delete('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await reuniaoService.excluir(id)
      return reply.status(200).send({ success: true, data: { message: 'Reunião excluída com sucesso' } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao excluir reunião' })
    }
  })
}
