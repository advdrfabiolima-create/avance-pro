import { api } from './api'

export type TipoMovimento = 'entrada' | 'saida'
export type OrigemMovimento = 'mensalidade' | 'matricula' | 'material' | 'salario' | 'aluguel' | 'servico' | 'outro'
export type StatusMovimento = 'confirmado' | 'pendente' | 'cancelado'

export interface MovimentoFinanceiro {
  id: string
  tipo: TipoMovimento
  origem: OrigemMovimento
  descricao: string
  valor: number
  data: string
  status: StatusMovimento
  pagamentoId?: string
  observacao?: string
  criadoEm: string
}

export interface ResumoMovimentos {
  totalEntradas: number
  totalSaidas: number
  saldo: number
}

export const movimentosService = {
  listar: (params?: {
    tipo?: TipoMovimento
    origem?: string
    status?: string
    dataInicio?: string
    dataFim?: string
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/movimentos', { params }),

  resumo: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<{ success: boolean; data: ResumoMovimentos & { porOrigem: any[] } }>('/movimentos/resumo', { params }),

  criar: (data: {
    tipo: TipoMovimento
    origem: OrigemMovimento
    descricao: string
    valor: number
    data: string
    status?: StatusMovimento
    pagamentoId?: string
    observacao?: string
  }) => api.post<{ success: boolean; data: MovimentoFinanceiro }>('/movimentos', data),

  atualizar: (id: string, data: Partial<MovimentoFinanceiro>) =>
    api.put<{ success: boolean; data: MovimentoFinanceiro }>(`/movimentos/${id}`, data),

  excluir: (id: string) => api.delete(`/movimentos/${id}`),
}
