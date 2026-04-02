import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { prisma } from '@kumon-advance/db'
import { asaasTestarConexao } from '../../shared/asaas.service'

function isErroNegocio(err: unknown): err is { statusCode: number; message: string } {
  return typeof err === 'object' && err !== null && 'statusCode' in err && 'message' in err
}

export async function configGatewayRoutes(app: FastifyInstance): Promise<void> {
  // GET / — retorna config atual (apiKey mascarada)
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    try {
      const config = await prisma.configGateway.findFirst({ where: { tipo: 'asaas' } })
      if (!config) return reply.send({ success: true, data: null })

      return reply.send({
        success: true,
        data: {
          id: config.id,
          tipo: config.tipo,
          ambiente: config.ambiente,
          ativo: config.ativo,
          apiKeyMasked: config.apiKey ? `${'•'.repeat(20)}${config.apiKey.slice(-6)}` : null,
          criadoEm: config.criadoEm,
        },
      })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar configuração' })
    }
  })

  // PUT / — salvar/atualizar configuração (apenas franqueado)
  app.put('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const { tipo, ambiente, apiKey } = (request.body ?? {}) as {
      tipo?: string
      ambiente?: string
      apiKey?: string
    }

    if (!tipo || !ambiente || !apiKey) {
      return reply.status(400).send({ success: false, error: 'tipo, ambiente e apiKey são obrigatórios' })
    }

    try {
      const existente = await prisma.configGateway.findFirst({ where: { tipo } })
      const config = existente
        ? await prisma.configGateway.update({
            where: { id: existente.id },
            data: { ambiente, apiKey, ativo: true },
          })
        : await prisma.configGateway.create({ data: { tipo, ambiente, apiKey } })

      return reply.send({
        success: true,
        data: {
          id: config.id,
          tipo: config.tipo,
          ambiente: config.ambiente,
          ativo: config.ativo,
          apiKeyMasked: `${'•'.repeat(20)}${config.apiKey.slice(-6)}`,
        },
      })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao salvar configuração' })
    }
  })

  // POST /testar — testa conexão com a API
  app.post('/testar', { preHandler: apenasAdmin }, async (request, reply) => {
    const { apiKey, ambiente } = (request.body ?? {}) as { apiKey?: string; ambiente?: string }
    if (!apiKey || !ambiente) {
      return reply.status(400).send({ success: false, error: 'apiKey e ambiente obrigatórios' })
    }
    try {
      const conta = await asaasTestarConexao(apiKey, ambiente)
      return reply.send({ success: true, data: { nome: conta.name, email: conta.email } })
    } catch (err) {
      if (isErroNegocio(err)) return reply.status(err.statusCode).send({ success: false, error: err.message })
      return reply.status(422).send({ success: false, error: 'API Key inválida ou sem conexão com o Asaas' })
    }
  })

  // DELETE / — desativar gateway
  app.delete('/', { preHandler: apenasAdmin }, async (_request, reply) => {
    try {
      await prisma.configGateway.updateMany({ where: { tipo: 'asaas' }, data: { ativo: false } })
      return reply.send({ success: true, data: { message: 'Gateway desativado' } })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao desativar gateway' })
    }
  })
}
