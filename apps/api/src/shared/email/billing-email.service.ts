import { prisma } from '@kumon-advance/db'
import { brevoSendEmail } from './brevo.provider'
import { reguaCobrancaService } from '../../modules/regua-cobranca/regua-cobranca.service'

/**
 * Renderiza um template de cobrança e envia por e-mail via Brevo.
 * O destinatário é o responsável principal do aluno vinculado à cobrança.
 */
export async function enviarEmailCobranca(params: {
  cobrancaId: string
  subject: string
  template: string
}): Promise<void> {
  const { cobrancaId, subject, template } = params

  const cobranca = await prisma.cobranca.findUnique({
    where: { id: cobrancaId },
    include: {
      aluno: {
        select: {
          nome: true,
          responsaveis: {
            where: { principal: true },
            include: { responsavel: { select: { nome: true, email: true } } },
            take: 1,
          },
        },
      },
    },
  })

  if (!cobranca) throw new Error('Cobrança não encontrada')

  const responsavel = cobranca.aluno.responsaveis[0]?.responsavel
  if (!responsavel?.email) {
    throw new Error(`Responsável do aluno "${cobranca.aluno.nome}" não possui e-mail cadastrado`)
  }

  const textContent = await reguaCobrancaService.renderTemplateForCharge(template, cobrancaId)

  // Converte quebras de linha em HTML simples
  const htmlContent = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333">${textContent.replace(/\n/g, '<br>')}</div>`

  await brevoSendEmail({
    to: { name: responsavel.nome, email: responsavel.email },
    subject,
    htmlContent,
    textContent,
  })
}
