/**
 * billing-automation.scheduler.ts
 *
 * Motor de execução automática da Régua de Cobrança.
 *
 * Ativação: variável de ambiente BILLING_AUTO_ENABLED=true
 * Horário  : BILLING_CRON_SCHEDULE (padrão "0 8 * * *" — 08:00 BRT)
 * Fuso     : America/Sao_Paulo
 *
 * FUTURE: trocar cron interno por fila Bull/BullMQ quando houver Redis.
 */

import cron from 'node-cron'
import { prisma } from '@kumon-advance/db'
import { reguaCobrancaService } from './regua-cobranca.service'
import { enviarEmailCobranca } from '../../shared/email/billing-email.service'

// ─── Processamento de item individual ────────────────────────────────────────

async function processQueueItem(
  cobranca: {
    id: string
    valor: string
    vencimento: string
    descricao: string | null
    aluno: { id: string; nome: string }
    telefone: string | null
    jaAcionada: boolean
  },
  rule: { id: string; name: string; channel: string; template: string; emailSubject?: string | null },
): Promise<void> {
  // Renderiza o template com os dados reais da cobrança
  const mensagem = await reguaCobrancaService.renderTemplateForCharge(rule.template, cobranca.id)

  if (rule.channel === 'whatsapp') {
    // Gera link wa.me e registra como "pendente" (aguarda toque do usuário)
    const telefoneNum = (cobranca.telefone ?? '').replace(/\D/g, '')
    const waLink = telefoneNum
      ? `https://wa.me/55${telefoneNum}?text=${encodeURIComponent(mensagem)}`
      : null

    await reguaCobrancaService.logAction({
      cobrancaId: cobranca.id,
      billingRuleId: rule.id,
      actionType: 'whatsapp_prepared',
      channel: 'whatsapp',
      messageSnapshot: mensagem,
      status: 'pendente',
      triggeredBy: 'scheduler',
      metadata: { auto: true, waLink },
    })
  } else if (rule.channel === 'email') {
    const subject = rule.emailSubject ?? `Lembrete de cobrança — ${cobranca.aluno.nome}`
    await enviarEmailCobranca({ cobrancaId: cobranca.id, subject, template: rule.template })

    await reguaCobrancaService.logAction({
      cobrancaId: cobranca.id,
      billingRuleId: rule.id,
      actionType: 'email_sent',
      channel: 'email',
      messageSnapshot: mensagem,
      status: 'enviado',
      triggeredBy: 'scheduler',
      metadata: { auto: true, subject },
    })
  } else if (rule.channel === 'internal') {
    // Alerta interno: registra como enviado diretamente (sem confirmação necessária)
    await reguaCobrancaService.logAction({
      cobrancaId: cobranca.id,
      billingRuleId: rule.id,
      actionType: 'internal_alert',
      channel: 'internal',
      messageSnapshot: mensagem,
      status: 'enviado',
      triggeredBy: 'scheduler',
      metadata: { auto: true },
    })
  }
}

// ─── Motor principal ──────────────────────────────────────────────────────────

export async function runBillingAutomation(): Promise<{
  processedCount: number
  errorCount: number
  skippedCount: number
  runId: string
}> {
  const autoEnabled = process.env['BILLING_AUTO_ENABLED'] === 'true'
  if (!autoEnabled) {
    console.log('[BillingAutomation] Desabilitado — defina BILLING_AUTO_ENABLED=true para ativar')
    return { processedCount: 0, errorCount: 0, skippedCount: 0, runId: '' }
  }

  // Cria registro da execução (status inicial: running)
  const run = await prisma.billingAutomationRun.create({
    data: { status: 'running', startedAt: new Date() },
  })

  let processedCount = 0
  let errorCount = 0
  let skippedCount = 0

  try {
    const fila = await reguaCobrancaService.getFilaHoje()

    for (const { rule, cobrancas } of fila) {
      for (const cobranca of cobrancas) {
        // Controle de duplicidade: getFilaHoje já marca jaAcionada,
        // mas verificamos novamente para garantir atomicidade
        if (cobranca.jaAcionada) {
          skippedCount++
          continue
        }

        try {
          await processQueueItem(cobranca, rule)
          processedCount++
        } catch (itemErr) {
          errorCount++
          console.error(
            `[BillingAutomation] Erro ao processar cobrança ${cobranca.id} / regra ${rule.id}:`,
            itemErr,
          )
          // Registra o erro sem interromper o loop
          await prisma.billingActionLog
            .create({
              data: {
                cobrancaId: cobranca.id,
                billingRuleId: rule.id,
                actionType: 'auto_error',
                channel: rule.channel,
                status: 'erro',
                triggeredBy: 'scheduler',
                metadata: JSON.stringify({ auto: true, error: String(itemErr) }),
              },
            })
            .catch(() => {})
        }
      }
    }

    // Finaliza run como concluído
    await prisma.billingAutomationRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        processedCount,
        errorCount,
        skippedCount,
      },
    })

    console.log(
      `[BillingAutomation] Concluído — processados: ${processedCount}, erros: ${errorCount}, pulados: ${skippedCount}`,
    )
  } catch (fatalErr) {
    console.error('[BillingAutomation] Erro fatal:', fatalErr)
    await prisma.billingAutomationRun
      .update({
        where: { id: run.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          processedCount,
          errorCount: errorCount + 1,
          details: String(fatalErr),
        },
      })
      .catch(() => {})
    throw fatalErr
  }

  return { processedCount, errorCount, skippedCount, runId: run.id }
}

// ─── Inicialização do cron ────────────────────────────────────────────────────

export function startScheduler(): void {
  const schedule = process.env['BILLING_CRON_SCHEDULE'] ?? '0 8 * * *'

  if (!cron.validate(schedule)) {
    console.error(`[BillingScheduler] Expressão cron inválida: "${schedule}" — scheduler não iniciado`)
    return
  }

  console.log(`[BillingScheduler] Cron registrado: "${schedule}" (America/Sao_Paulo)`)

  cron.schedule(
    schedule,
    async () => {
      console.log('[BillingScheduler] Iniciando execução automática...')
      try {
        await runBillingAutomation()
      } catch (err) {
        console.error('[BillingScheduler] Erro fatal na execução agendada:', err)
      }
    },
    { timezone: 'America/Sao_Paulo' },
  )
}
