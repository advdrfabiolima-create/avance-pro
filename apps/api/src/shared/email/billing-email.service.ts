import { prisma } from '@kumon-advance/db'
import { brevoSendEmail } from './brevo.provider'
import { reguaCobrancaService } from '../../modules/regua-cobranca/regua-cobranca.service'
import { env } from '../config/env'

/**
 * Resolve o nome do remetente para e-mails de cobrança desta unidade.
 *
 * Ordem de prioridade:
 *  1. emailSenderName configurado pela unidade (ex: "Kumon Manaíra")
 *  2. nome da unidade (ConfigEmpresa.nome)
 *  3. BREVO_SENDER_NAME global (fallback de ambiente)
 */
export function resolveBillingSenderName(
  unit: { emailSenderName?: string | null; nome?: string | null } | null,
): string {
  return unit?.emailSenderName?.trim() || unit?.nome?.trim() || env.BREVO_SENDER_NAME
}

/**
 * Renderiza um template de cobrança e envia por e-mail via Brevo.
 * O destinatário é o responsável principal do aluno vinculado à cobrança.
 * O nome do remetente é resolvido dinamicamente a partir da configuração da unidade.
 */
export async function enviarEmailCobranca(params: {
  cobrancaId: string
  subject: string
  template: string
}): Promise<void> {
  const { cobrancaId, subject, template } = params

  const [cobranca, unitConfig] = await Promise.all([
    prisma.cobranca.findUnique({
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
    }),
    prisma.configEmpresa.findFirst({
      select: { emailSenderName: true, nome: true },
    }),
  ])

  if (!cobranca) throw new Error('Cobrança não encontrada')

  const responsavel = cobranca.aluno.responsaveis[0]?.responsavel
  if (!responsavel?.email) {
    throw new Error(`Responsável do aluno "${cobranca.aluno.nome}" não possui e-mail cadastrado`)
  }

  const textContent = await reguaCobrancaService.renderTemplateForCharge(template, cobrancaId)
  const htmlContent = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333">${textContent.replace(/\n/g, '<br>')}</div>`

  await brevoSendEmail({
    to: { name: responsavel.nome, email: responsavel.email },
    subject,
    htmlContent,
    textContent,
    senderName: resolveBillingSenderName(unitConfig),
  })
}
