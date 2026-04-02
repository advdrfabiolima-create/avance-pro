import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { responsavelService } from './responsaveis.service'
import {
  criarResponsavelSchema,
  atualizarResponsavelSchema,
  vincularAlunoSchema,
  filtrosResponsavelSchema,
} from './responsaveis.schema'

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

export async function responsaveisRoutes(app: FastifyInstance): Promise<void> {
  // POST / — autenticado
  app.post('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = criarResponsavelSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const responsavel = await responsavelService.criar(resultado.data)
      return reply.status(201).send({ success: true, data: responsavel })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao criar responsável' })
    }
  })

  // GET / — autenticado, query: busca?, page?, pageSize?
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosResponsavelSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Parâmetros inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const resposta = await responsavelService.listar(resultado.data)
      return reply.status(200).send({ success: true, data: resposta })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao listar responsáveis' })
    }
  })

  // GET /:id — autenticado
  app.get('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    try {
      const responsavel = await responsavelService.buscarPorId(id)
      return reply.status(200).send({ success: true, data: responsavel })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao buscar responsável' })
    }
  })

  // PUT /:id — autenticado
  app.put('/:id', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const resultado = atualizarResponsavelSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const responsavel = await responsavelService.atualizar(id, resultado.data)
      return reply.status(200).send({ success: true, data: responsavel })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao atualizar responsável' })
    }
  })

  // POST /:id/alunos — autenticado
  app.post('/:id/alunos', { preHandler: autenticar }, async (request, reply) => {
    const { id: responsavelId } = request.params as { id: string }

    const resultado = vincularAlunoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    const { alunoId, parentesco, principal } = resultado.data

    try {
      const vinculo = await responsavelService.vincularAluno(
        responsavelId,
        alunoId,
        parentesco,
        principal,
      )
      return reply.status(201).send({ success: true, data: vinculo })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao vincular aluno' })
    }
  })

  // DELETE /:id/alunos/:alunoId — autenticado, franqueado
  app.delete('/:id/alunos/:alunoId', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id: responsavelId, alunoId } = request.params as {
      id: string
      alunoId: string
    }

    try {
      await responsavelService.desvincularAluno(responsavelId, alunoId)
      return reply
        .status(200)
        .send({ success: true, data: { message: 'Vínculo removido com sucesso' } })
    } catch (err) {
      if (isErroNegocio(err)) {
        return reply.status(err.statusCode).send({ success: false, error: err.message })
      }
      return reply.status(500).send({ success: false, error: 'Erro ao desvincular aluno' })
    }
  })
}
