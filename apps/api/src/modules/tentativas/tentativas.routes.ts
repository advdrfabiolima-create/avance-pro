import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { tentativasService } from './tentativas.service'
import { criarTentativaSchema, submeterRespostasSchema, filtrosTentativaSchema } from './tentativas.schema'

function isErroNegocio(err: unknown): err is { statusCode: number; message: string } {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function tentativasRoutes(app: FastifyInstance): Promise<void> {
  // GET / — listar tentativas
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosTentativaSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos' })
    }
    try {
      const data = await tentativasService.listar(resultado.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao listar tentativas' })
    }
  })

  // GET /:id
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = await tentativasService.buscarPorId(id)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar tentativa' })
    }
  })

  // POST / — iniciar tentativa
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarTentativaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await tentativasService.criar(resultado.data)
      return reply.status(201).send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao iniciar tentativa' })
    }
  })

  // POST /:id/submeter — submeter respostas e corrigir
  app.post('/:id/submeter', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const resultado = submeterRespostasSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos', detalhes: resultado.error.flatten().fieldErrors })
    }
    try {
      const data = await tentativasService.submeterECorrigir(id, resultado.data)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao corrigir tentativa' })
    }
  })

  // GET /aluno/:alunoId/erros — erros recorrentes do aluno
  app.get('/aluno/:alunoId/erros', { preHandler: autenticar }, async (request, reply) => {
    const { alunoId } = request.params as { alunoId: string }
    try {
      const data = await tentativasService.errosRecorrentes(alunoId)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar erros recorrentes' })
    }
  })

  // GET /aluno/:alunoId/sugestoes — sugestões de reforço
  app.get('/aluno/:alunoId/sugestoes', { preHandler: autenticar }, async (request, reply) => {
    const { alunoId } = request.params as { alunoId: string }
    try {
      const data = await tentativasService.sugestoes(alunoId)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao buscar sugestões' })
    }
  })

  // PATCH /sugestoes/:id/visualizar
  app.patch('/sugestoes/:id/visualizar', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const data = await tentativasService.marcarSugestaoVisualizada(id)
      return reply.send({ success: true, data })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(500).send({ success: false, error: 'Erro ao marcar sugestão' })
    }
  })
}
