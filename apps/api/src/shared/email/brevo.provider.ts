import { env } from '../config/env'

export interface BrevoEmailParams {
  to: { name: string; email: string }
  subject: string
  htmlContent: string
  textContent?: string
  /** Sobrescreve env.BREVO_SENDER_NAME quando fornecido (ex: nome dinâmico por unidade). */
  senderName?: string
}

/**
 * Resolve o nome do remetente com fallback seguro:
 * 1. senderName explícito (dinâmico por unidade)
 * 2. BREVO_SENDER_NAME do ambiente (fallback global)
 */
export function resolveSenderName(senderName?: string | null): string {
  return senderName?.trim() || env.BREVO_SENDER_NAME
}

/**
 * Traduz erros da API Brevo para mensagens acionáveis em português.
 */
function traduzirErroBrevo(status: number, body: string): string {
  let parsed: { code?: string; message?: string } = {}
  try { parsed = JSON.parse(body) } catch { /* usa body bruto */ }

  const code = parsed.code ?? ''
  const msg  = parsed.message ?? ''

  if (status === 400 && (msg.toLowerCase().includes('sender') || code === 'invalid_parameter')) {
    return (
      `Remetente não verificado na Brevo. ` +
      `O e-mail "${env.BREVO_SENDER_EMAIL}" precisa ser cadastrado como remetente autorizado. ` +
      `Acesse app.brevo.com → Senders & IP → Senders e adicione este endereço.`
    )
  }

  if (status === 401 || code === 'unauthorized') {
    return (
      `BREVO_API_KEY inválida ou sem permissão para envio de e-mails. ` +
      `Verifique o valor da variável no Railway.`
    )
  }

  if (status === 402) {
    return `Limite do plano Brevo atingido. Verifique sua cota de envios em app.brevo.com.`
  }

  if (msg) return `Brevo: ${msg}`
  return `Erro Brevo ${status}: ${body}`
}

/**
 * Envia e-mail transacional via Brevo REST API (v3).
 * Requer BREVO_API_KEY e BREVO_SENDER_EMAIL configuradas no ambiente.
 * O e-mail remetente é sempre global (BREVO_SENDER_EMAIL).
 * O nome exibido pode ser dinâmico via params.senderName.
 */
export async function brevoSendEmail(params: BrevoEmailParams): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error(
      'BREVO_API_KEY não configurada. Adicione a variável de ambiente no Railway para habilitar o envio de e-mails.',
    )
  }

  if (!env.BREVO_SENDER_EMAIL) {
    throw new Error(
      'BREVO_SENDER_EMAIL não configurada. Defina o e-mail remetente nas variáveis de ambiente do Railway.',
    )
  }

  const body = {
    sender: { name: resolveSenderName(params.senderName), email: env.BREVO_SENDER_EMAIL },
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
    throw new Error(traduzirErroBrevo(res.status, errorText))
  }
}
