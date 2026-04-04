import { api } from './api'

export type ReconciliacaoStatus = 'pendente' | 'conciliado' | 'ignorado' | 'divergente'
export type MatchType = 'auto' | 'manual' | 'imported' | 'webhook' | 'cnab'

export interface Reconciliacao {
  id: string
  cobrancaId: string
  movimentoId?: string | null
  provider?: string | null
  status: ReconciliacaoStatus
  matchType?: MatchType | null
  notas?: string | null
  reconciladoEm?: string | null
  reconciladoPor?: string | null
  criadoEm: string
}

export interface MovimentoSugestao {
  id: string
  descricao: string
  valor: number | string
  data: string
  origem: string
}

export interface CobrancaPendente {
  id: string
  valor: number | string
  vencimento: string
  status: string
  descricao?: string | null
  provider?: string | null
  asaasId?: string | null
  pagoEm?: string | null
  aluno: {
    id: string
    nome: string
    foto?: string | null
    responsaveis: Array<{ responsavel: { nome: string } }>
  }
  reconciliacao: Reconciliacao | null
  sugestao: MovimentoSugestao | null
}

export interface ResumoConciliacao {
  pendentes: number
  conciliadasHoje: number
  divergentes: number
  total: number
}

export const conciliacaoService = {
  resumo: () =>
    api.get<{ success: boolean; data: ResumoConciliacao }>('/conciliacao/resumo'),

  pendentes: (params?: { page?: number; pageSize?: number }) =>
    api.get<{ success: boolean; data: { data: CobrancaPendente[]; total: number; totalPaginas: number } }>(
      '/conciliacao/pendentes',
      { params },
    ),

  historico: () =>
    api.get<{ success: boolean; data: any[] }>('/conciliacao/historico'),

  confirmar: (id: string, data: { movimentoId?: string; notas?: string; matchType?: MatchType }) =>
    api.post<{ success: boolean; data: Reconciliacao }>(`/conciliacao/${id}/confirmar`, data),

  pagarManual: (id: string, notas?: string) =>
    api.post<{ success: boolean; data: Reconciliacao }>(`/conciliacao/${id}/pagar-manual`, { notas }),

  ignorar: (id: string, notas?: string) =>
    api.post<{ success: boolean; data: Reconciliacao }>(`/conciliacao/${id}/ignorar`, { notas }),
}
