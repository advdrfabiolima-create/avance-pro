import nodemailer from 'nodemailer'
import { env } from '../../shared/config/env'

interface Destinatario {
  nome: string
  email: string
  telefone: string
}

export class NotificacaoService {
  private readonly transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  }

  async enviar(
    destinatario: Destinatario,
    assunto: string,
    mensagem: string,
  ): Promise<void> {
    const html = this.gerarHtmlEmail(assunto, mensagem, destinatario.nome)

    await Promise.all([
      this.enviarEmail(destinatario.email, assunto, html).catch((err: unknown) => {
        console.error('[NotificacaoService] Falha ao enviar e-mail:', err)
      }),
      this.enviarWhatsApp(destinatario.telefone, mensagem).catch((err: unknown) => {
        console.error('[NotificacaoService] Falha ao enviar WhatsApp:', err)
      }),
    ])
  }

  async enviarEmail(para: string, assunto: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to: para,
      subject: assunto,
      html,
    })
  }

  async enviarWhatsApp(telefone: string, mensagem: string): Promise<void> {
    const apenasDigitos = telefone.replace(/\D/g, '')
    const numero = apenasDigitos.startsWith('55') ? apenasDigitos : `55${apenasDigitos}`

    const url = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`

    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: numero,
        text: mensagem,
      }),
    })

    if (!resposta.ok) {
      const corpo = await resposta.text()
      throw new Error(
        `Evolution API retornou ${resposta.status}: ${corpo}`,
      )
    }
  }

  gerarHtmlEmail(
    assunto: string,
    mensagem: string,
    nomeDestinatario: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${assunto}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 32px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background-color: #003087; padding: 24px 32px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0; color: #a8c0e8; font-size: 13px; }
    .body { padding: 32px; color: #333333; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .mensagem { background-color: #f0f4ff; border-left: 4px solid #003087; padding: 16px 20px; border-radius: 4px; margin: 24px 0; white-space: pre-line; }
    .footer { padding: 20px 32px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #888888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Kumon Advance</h1>
      <p>Sistema de Gestão de Franquia</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
      <div class="mensagem">${mensagem}</div>
      <p>Em caso de dúvidas, entre em contato com a unidade Kumon.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Kumon Advance — Esta mensagem foi gerada automaticamente, por favor não responda.</p>
    </div>
  </div>
</body>
</html>`
  }
}

export const notificacaoService = new NotificacaoService()
