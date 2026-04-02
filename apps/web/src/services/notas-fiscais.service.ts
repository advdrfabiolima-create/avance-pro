import { api } from './api'

export type StatusNotaFiscal = 'rascunho' | 'emitida' | 'cancelada'

export interface NotaFiscal {
  id: string
  alunoId: string
  responsavelId?: string
  numero?: string
  valor: number
  competencia: string
  status: StatusNotaFiscal
  descricao?: string
  xmlUrl?: string
  criadoEm: string
  emitidaEm?: string
  aluno: { id: string; nome: string; foto?: string }
  responsavel?: { id: string; nome: string; cpf?: string; email: string }
}

export const notasFiscaisService = {
  listar: (params?: {
    alunoId?: string
    status?: string
    dataInicio?: string
    dataFim?: string
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/notas-fiscais', { params }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: NotaFiscal }>(`/notas-fiscais/${id}`),

  criar: (data: { alunoId: string; responsavelId?: string; valor: number; competencia: string; descricao?: string }) =>
    api.post<{ success: boolean; data: NotaFiscal }>('/notas-fiscais', data),

  atualizar: (id: string, data: Partial<{ numero: string; status: StatusNotaFiscal; descricao: string; xmlUrl: string }>) =>
    api.put<{ success: boolean; data: NotaFiscal }>(`/notas-fiscais/${id}`, data),
}
