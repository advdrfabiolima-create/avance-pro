// ─── Tipos do sistema de aprendizado contínuo ────────────────────────────────

export interface FeedbackInput {
  disciplina: string
  gabarito: string
  respostaAluno: string
  statusIa: string
  statusFinal: string
  ajustado: boolean      // professor discordou da IA
  motivoIa?: string | null
}

export interface AjusteAplicado {
  statusAjustado: string
  confianca: number      // 0.0–1.0
  ocorrencias: number
}

export interface AjusteCacheEntry {
  statusCorrigido: string
  confianca: number
  ocorrencias: number
}
