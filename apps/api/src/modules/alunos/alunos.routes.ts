import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { alunoService } from './alunos.service'
import { criarAlunoSchema, atualizarAlunoSchema, filtrosAlunoSchema } from './alunos.schema'
import { prisma } from '@kumon-advance/db'

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

export async function alunosRoutes(app: FastifyInstance): Promise<void> {
  // POST / — autenticado
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarAlunoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const aluno = await alunoService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: aluno })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao criar aluno' })
    }
  })

  // GET / — autenticado, query params de filtros
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosAlunoSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Parâmetros inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const resposta = await alunoService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar alunos' })
    }
  })

  // GET /:id — autenticado
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const aluno = await alunoService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: aluno })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar aluno' })
    }
  })

  // PUT /:id — autenticado
  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const resultado = atualizarAlunoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const aluno = await alunoService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: aluno })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar aluno' })
    }
  })

  // DELETE /:id — autenticado, apenas franqueado (desativa, não apaga)
  app.delete('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      await alunoService.desativar(id)
      return reply.status(200).send({ success: true, data: { message: 'Aluno desativado com sucesso' } })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao desativar aluno' })
    }
  })

  // PATCH /:id/foto — atualizar foto do aluno (base64 ou URL)
  app.patch('/:id/foto', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { foto } = (request.body ?? {}) as { foto?: string | null }

    try {
      const aluno = await prisma.aluno.update({
        where: { id },
        data: { foto: foto ?? null },
        select: { id: true, nome: true, foto: true },
      })
      return reply.status(200).send({ success: true, data: aluno })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar foto do aluno' })
    }
  })

  // POST /:id/matriculas — criar matrícula para um aluno
  app.post('/:id/matriculas', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { materiaId: string; nivelAtualId: string; dataInicio: string }

    if (!body.materiaId || !body.nivelAtualId || !body.dataInicio) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    }

    try {
      // Verificar se já tem matrícula ativa nessa matéria
      const existente = await prisma.matricula.findFirst({
        where: { alunoId: id, materiaId: body.materiaId, ativo: true },
      })
      if (existente) {
        return reply.status(409).send({ success: false, error: 'Aluno já possui matrícula ativa nessa matéria' })
      }

      const matricula = await prisma.matricula.create({
        data: {
          alunoId: id,
          materiaId: body.materiaId,
          nivelAtualId: body.nivelAtualId,
          dataInicio: new Date(body.dataInicio),
        },
        include: { materia: true, nivelAtual: true },
      })

      return reply.status(201).send({ success: true, data: matricula })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao criar matrícula' })
    }
  })
}
