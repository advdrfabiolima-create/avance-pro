import { api } from './api'

export type EventType = 'before' | 'on_due' | 'after'
export type Channel = 'whatsapp' | 'internal' | 'email' | 'webhook'
export type ActionStatus = 'pendente' | 'enviado' | 'ignorado' | 'erro'

export interface BillingRule {
  id: string
  name: string
  eventType: EventType
  offsetDays: number
  channel: Channel
  template: string
  emailSubject?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BillingActionLog {
  id: string
  cobrancaId: string
  billingRuleId: string | null
  actionType: string
  channel: Channel
  messageSnapshot: string | null
  status: ActionStatus
  triggeredAt: string
  triggeredBy: string | null
  metadata: string | null
  createdAt: string
  cobranca?: {
    id: string
    valor: string | number
    vencimento: string
    descricao: string | null
    aluno: { id: string; nome: string; foto: string | null }
  }
  billingRule?: { id: string; name: string } | null
}

export interface FilaItem {
  id: string
  valor: string
  vencimento: string
  descricao: string | null
  aluno: { id: string; nome: string; foto: string | null }
  responsavel: string | null
  telefone: string | null
  jaAcionada: boolean
}

export interface FilaHoje {
  rule: BillingRule
  cobrancas: FilaItem[]
}

export interface ResumoRegua {
  regrasAtivas: number
  vencendoHoje: number
  vencendoEm3Dias: number
  atrasoCritico: number
  acoesHoje: number
}

export interface AutomationRun {
  id: string
  status: 'running' | 'completed' | 'error'
  startedAt: string
  finishedAt: string | null
  processedCount: number
  errorCount: number
  skippedCount: number
  details: string | null
}

export interface AutomationStatus {
  autoEnabled: boolean
  cronSchedule: string
  ultimaExecucao: AutomationRun | null
  execucoesHoje: number
  acoesAutoHoje: number
}

export const reguaCobrancaService = {
  resumo: () =>
    api.get<{ success: boolean; data: ResumoRegua }>('/regua-cobranca/resumo'),

  listRules: () =>
    api.get<{ success: boolean; data: BillingRule[] }>('/regua-cobranca/regras'),

  createRule: (data: Omit<BillingRule, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ success: boolean; data: BillingRule }>('/regua-cobranca/regras', data),

  updateRule: (id: string, data: Partial<Omit<BillingRule, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ success: boolean; data: BillingRule }>(`/regua-cobranca/regras/${id}`, data),

  toggleRule: (id: string) =>
    api.patch<{ success: boolean; data: BillingRule }>(`/regua-cobranca/regras/${id}/toggle`),

  deleteRule: (id: string) =>
    api.delete<{ success: boolean }>(`/regua-cobranca/regras/${id}`),

  getFilaHoje: () =>
    api.get<{ success: boolean; data: FilaHoje[] }>('/regua-cobranca/fila-hoje'),

  renderTemplate: (template: string, cobrancaId: string) =>
    api.post<{ success: boolean; data: { rendered: string } }>('/regua-cobranca/render-template', {
      template,
      cobrancaId,
    }),

  logAction: (data: {
    cobrancaId: string
    billingRuleId?: string | null
    actionType: string
    channel: string
    messageSnapshot?: string
    status?: string
    metadata?: Record<string, unknown>
  }) =>
    api.post<{ success: boolean; data: BillingActionLog }>('/regua-cobranca/acoes', data),

  historico: () =>
    api.get<{ success: boolean; data: BillingActionLog[] }>('/regua-cobranca/historico'),

  historicoPorCobranca: (cobrancaId: string) =>
    api.get<{ success: boolean; data: BillingActionLog[] }>(`/regua-cobranca/historico/${cobrancaId}`),

  automationStatus: () =>
    api.get<{ success: boolean; data: AutomationStatus }>('/regua-cobranca/automation-status'),

  automationRuns: () =>
    api.get<{ success: boolean; data: AutomationRun[] }>('/regua-cobranca/automation-runs'),

  runAutomation: () =>
    api.post<{ success: boolean; data: { processedCount: number; errorCount: number; skippedCount: number; runId: string } }>(
      '/regua-cobranca/run-automation',
    ),
}

// ── Utilitário WhatsApp assistido ──────────────────────────────────────────────

/**
 * Monta a URL do WhatsApp Web/app com a mensagem pré-preenchida.
 * O usuário clica e envia manualmente — "assistido".
 *
 * WHATSAPP-API-READY: quando integrar com WhatsApp Business API (Meta ou provider),
 * substituir esta função por uma chamada real ao endpoint de envio,
 * mantendo o logAction() para rastrear o disparo.
 */
export function montarUrlWhatsapp(telefone: string, mensagem: string): string {
  const numero = telefone.replace(/\D/g, '')
  const completo = numero.startsWith('55') ? numero : `55${numero}`
  return `https://wa.me/${completo}?text=${encodeURIComponent(mensagem)}`
}

/** Copia texto para a área de transferência com fallback */
export async function copiarMensagem(texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    const el = document.createElement('textarea')
    el.value = texto
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}
