import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { sessaoService } from './sessoes.service'
import { criarSessaoSchema, filtrosSessaoSchema } from './sessoes.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function isErroNegocio(err: unknown): err is ErroNegocio {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    'message' in err
  )
}

export async function sessoesRoutes(app: FastifyInstance): Promise<void> {
  // POST / — autenticado — criar sessão
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarSessaoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const sessao = await sessaoService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: sessao })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao criar sessão' })
    }
  })

  // GET / — autenticado — listar sessões com filtros
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosSessaoSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Parâmetros inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const dados = await sessaoService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: dados })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar sessões' })
    }
  })

  // GET /aluno/:alunoId — autenticado — histórico do aluno
  app.get('/aluno/:alunoId', { preHandler: autenticar }, async (request, reply) => {
    const { alunoId } = request.params as { alunoId: string }
    const query = request.query as { page?: string; pageSize?: string }

    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '20', 10) || 20))

    try {
      const dados = await sessaoService.buscarPorAluno(alunoId, page, pageSize)
      return reply.status(200).send({ success: true, data: dados })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar histórico do aluno' })
    }
  })

  // GET /aluno/:alunoId/desempenho/:matriculaId — autenticado — resumo de desempenho
  app.get(
    '/aluno/:alunoId/desempenho/:matriculaId',
    { preHandler: autenticar },
    async (request, reply) => {
      const { alunoId, matriculaId } = request.params as {
        alunoId: string
        matriculaId: string
      }

      try {
        const resumo = await sessaoService.resumoDesempenho(alunoId, matriculaId)
        return reply.status(200).send({ success: true, data: resumo })
      } catch (err) {
        if (isErroNegocio(err)) {
          return reply.status(err.statusCode).send({ success: false, error: err.message })
        }
        return reply
          .status(500)
          .send({ success: false, error: 'Erro ao buscar resumo de desempenho' })
      }
    },
  )

  // GET /:id — autenticado — buscar sessão por ID
  // Deve vir APÓS as rotas /aluno/* para não capturá-las
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const sessao = await sessaoService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: sessao })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar sessão' })
    }
  })
}
