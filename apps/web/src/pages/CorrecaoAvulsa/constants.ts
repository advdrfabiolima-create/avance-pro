import type { StatusCorrecaoQuestao } from '../../services/correcao-avulsa.service'

// ─── Labels legíveis por status ───────────────────────────────────────────────

export const STATUS_LABEL: Record<StatusCorrecaoQuestao, string> = {
  correta: 'Correta',
  incorreta_por_ortografia: 'Ortografia',
  incorreta_por_acentuacao: 'Acentuação',
  incorreta_por_pontuacao: 'Pontuação',
  incorreta_por_maiuscula: 'Maiúscula',
  incorreta_por_regra: 'Incorreta',
  revisar: 'Revisar',
}

// ─── Símbolos de correção ─────────────────────────────────────────────────────

export const SIMBOLOS: Record<StatusCorrecaoQuestao, string> = {
  correta: '✔',
  incorreta_por_ortografia: 'ABC',
  incorreta_por_acentuacao: '´',
  incorreta_por_pontuacao: '.',
  incorreta_por_maiuscula: 'Aa',
  incorreta_por_regra: '✖',
  revisar: '?',
}

// ─── Classes de cor por status ────────────────────────────────────────────────

/** Badge (chip pequeno) */
export const STATUS_BADGE: Record<StatusCorrecaoQuestao, string> = {
  correta: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  incorreta_por_ortografia: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_acentuacao: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_pontuacao: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_maiuscula: 'bg-red-100 text-red-600 border-red-200',
  incorreta_por_regra: 'bg-red-100 text-red-600 border-red-200',
  revisar: 'bg-amber-100 text-amber-700 border-amber-200',
}

/** Borda lateral do card */
export const STATUS_CARD_BORDER: Record<StatusCorrecaoQuestao, string> = {
  correta: 'border-l-emerald-400',
  incorreta_por_ortografia: 'border-l-red-400',
  incorreta_por_acentuacao: 'border-l-red-400',
  incorreta_por_pontuacao: 'border-l-red-400',
  incorreta_por_maiuscula: 'border-l-red-400',
  incorreta_por_regra: 'border-l-red-400',
  revisar: 'border-l-amber-400',
}

/** Ponto de status (indicador circular) */
export const STATUS_DOT: Record<StatusCorrecaoQuestao, string> = {
  correta: 'bg-emerald-500',
  incorreta_por_ortografia: 'bg-red-500',
  incorreta_por_acentuacao: 'bg-red-500',
  incorreta_por_pontuacao: 'bg-red-500',
  incorreta_por_maiuscula: 'bg-red-500',
  incorreta_por_regra: 'bg-red-500',
  revisar: 'bg-amber-500',
}

/** Texto da resposta do aluno quando incorreta */
export const STATUS_TEXT: Record<StatusCorrecaoQuestao, string> = {
  correta: 'text-emerald-700',
  incorreta_por_ortografia: 'text-red-600',
  incorreta_por_acentuacao: 'text-red-600',
  incorreta_por_pontuacao: 'text-red-600',
  incorreta_por_maiuscula: 'text-red-600',
  incorreta_por_regra: 'text-red-600',
  revisar: 'text-amber-700',
}

// ─── Opções de override (botões de decisão do professor) ─────────────────────

export interface OverrideOption {
  status: StatusCorrecaoQuestao
  decisao: boolean
  label: string
  simbolo: string
  cls: string      // classes do botão não-selecionado
  clsActive: string // classes quando selecionado
}

export const OVERRIDE_OPTIONS: OverrideOption[] = [
  {
    status: 'correta',
    decisao: true,
    label: 'Correta',
    simbolo: '✔',
    cls: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    clsActive: 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-300 ring-offset-1',
  },
  {
    status: 'incorreta_por_acentuacao',
    decisao: false,
    label: 'Acento',
    simbolo: '´',
    cls: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    clsActive: 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-1',
  },
  {
    status: 'incorreta_por_pontuacao',
    decisao: false,
    label: 'Pontuação',
    simbolo: '.',
    cls: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    clsActive: 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-1',
  },
  {
    status: 'incorreta_por_ortografia',
    decisao: false,
    label: 'Ortografia',
    simbolo: 'ABC',
    cls: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    clsActive: 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-1',
  },
  {
    status: 'incorreta_por_maiuscula',
    decisao: false,
    label: 'Maiúscula',
    simbolo: 'Aa',
    cls: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    clsActive: 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-1',
  },
  {
    status: 'incorreta_por_regra',
    decisao: false,
    label: 'Incorreta',
    simbolo: '✖',
    cls: 'border-slate-200 text-slate-600 hover:bg-slate-50',
    clsActive: 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200 ring-offset-1',
  },
  {
    status: 'revisar',
    decisao: false,
    label: 'Revisar',
    simbolo: '?',
    cls: 'border-slate-200 text-slate-600 hover:bg-amber-50',
    clsActive: 'border-amber-300 bg-amber-50 text-amber-700 ring-2 ring-amber-200 ring-offset-1',
  },
]
