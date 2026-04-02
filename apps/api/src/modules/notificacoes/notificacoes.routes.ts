import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@kumon-advance/db'
import { apenasAdmin } from '../../shared/middlewares/auth'
import { notificacaoService } from './notificacoes.service'

const enviarNotificacaoSchema = z.object({
  responsavelId: z.string().uuid({ message: 'ID do responsável inválido' }),
  assunto: z.string().min(1, { message: 'Assunto é obrigatório' }),
  mensagem: z.string().min(1, { message: 'Mensagem é obrigatória' }),
})

export async function notificacoesRoutes(app: FastifyInstance): Promise<void> {
  // POST /enviar — autenticado, franqueado — envia notificação manual para um responsável
  app.post('/enviar', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = enviarNotificacaoSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    const { responsavelId, assunto, mensagem } = resultado.data

    const responsavel = await prisma.responsavel.findUnique({
      where: { id: responsavelId },
    })

    if (!responsavel) {
      return reply.status(404).send({
        success: false,
        error: 'Responsável não encontrado',
      })
    }

    try {
      await notificacaoService.enviar(
        {
          nome: responsavel.nome,
          email: responsavel.email,
          telefone: responsavel.telefone,
        },
        assunto,
        mensagem,
      )

      return reply.status(200).send({
        success: true,
        message: `Notificação enviada para ${responsavel.nome}`,
      })
    } catch (err) {
      const detalhe = err instanceof Error ? err.message : 'Erro desconhecido'
      return reply.status(500).send({
        success: false,
        error: `Falha ao enviar notificação: ${detalhe}`,
      })
    }
  })
}
