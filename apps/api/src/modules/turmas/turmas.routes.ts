import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { turmaService } from './turmas.service'
import {
  criarTurmaSchema,
  atualizarTurmaSchema,
  adicionarAlunoSchema,
} from './turmas.schema'

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

export async function turmasRoutes(app: FastifyInstance): Promise<void> {
  // POST / — autenticado, franqueado — criar turma
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarTurmaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const turma = await turmaService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: turma })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao criar turma' })
    }
  })

  // GET / — autenticado — listar turmas
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    try {
      const turmas = await turmaService.listar()
      return reply.status(200).send({ success: true, data: turmas })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar turmas' })
    }
  })

  // GET /:id — autenticado — buscar turma por ID
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const turma = await turmaService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: turma })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar turma' })
    }
  })

  // PUT /:id — autenticado, franqueado — atualizar turma
  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const resultado = atualizarTurmaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const turma = await turmaService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: turma })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar turma' })
    }
  })

  // POST /:id/alunos — autenticado — adicionar aluno à turma
  app.post('/:id/alunos', { preHandler: autenticar }, async (request, reply) => {
    const { id: turmaId } = request.params as { id: string }

    const resultado = adicionarAlunoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const vinculo = await turmaService.adicionarAluno(
        turmaId,
        resultado.data.alunoId,
        resultado.data.dataInicio,
      )
      return reply.status(201).send({ success: true, data: vinculo })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao adicionar aluno à turma' })
    }
  })

  // DELETE /:id/alunos/:alunoId — autenticado, franqueado — remover aluno da turma
  app.delete(
    '/:id/alunos/:alunoId',
    { preHandler: apenasAdmin },
    async (request, reply) => {
      const { id: turmaId, alunoId } = request.params as { id: string; alunoId: string }

      try {
        const vinculo = await turmaService.removerAluno(turmaId, alunoId)
        return reply.status(200).send({ success: true, data: vinculo })
      } catch (err) {
        if (isErroNegocio(err)) {
          return reply.status(err.statusCode).send({ success: false, error: err.message })
        }
        return reply.status(500).send({ success: false, error: 'Erro ao remover aluno da turma' })
      }
    },
  )
}
