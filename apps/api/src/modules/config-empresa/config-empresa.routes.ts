import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { prisma } from '@kumon-advance/db'

export async function configEmpresaRoutes(app: FastifyInstance): Promise<void> {
  // GET / — retorna configuração da empresa
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    try {
      const config = await prisma.configEmpresa.findFirst()
      return reply.send({ success: true, data: config ?? null })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar configuração da empresa' })
    }
  })

  // PUT / — salvar/atualizar configuração (apenas franqueado)
  app.put('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      nome?: string
      cnpj?: string
      logo?: string
      cep?: string
      rua?: string
      numero?: string
      complemento?: string
      bairro?: string
      cidade?: string
      estado?: string
      emailSenderName?: string
    }

    if (!body.nome?.trim()) {
      return reply.status(400).send({ success: false, error: 'Nome da unidade é obrigatório' })
    }

    const data = {
      nome: body.nome.trim(),
      cnpj: body.cnpj?.trim() || null,
      logo: body.logo || null,
      cep: body.cep?.trim() || null,
      rua: body.rua?.trim() || null,
      numero: body.numero?.trim() || null,
      complemento: body.complemento?.trim() || null,
      bairro: body.bairro?.trim() || null,
      cidade: body.cidade?.trim() || null,
      estado: body.estado?.trim() || null,
      emailSenderName: body.emailSenderName?.trim() || null,
    }

    try {
      const existente = await prisma.configEmpresa.findFirst()
      const config = existente
        ? await prisma.configEmpresa.update({ where: { id: existente.id }, data })
        : await prisma.configEmpresa.create({ data })

      return reply.send({ success: true, data: config })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao salvar configuração da empresa' })
    }
  })
}
