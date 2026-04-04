import { env } from '../config/env'

export interface BrevoEmailParams {
  to: { name: string; email: string }
  subject: string
  htmlContent: string
  textContent?: string
}

/**
 * Envia e-mail transacional via Brevo REST API (v3).
 * Requer BREVO_API_KEY configurada no ambiente.
 */
export async function brevoSendEmail(params: BrevoEmailParams): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY não configurada — configure a variável de ambiente para enviar e-mails via Brevo')
  }

  const body = {
    sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
    to: [params.to],
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText)
    throw new Error(`Brevo API error ${res.status}: ${errorText}`)
  }
}
