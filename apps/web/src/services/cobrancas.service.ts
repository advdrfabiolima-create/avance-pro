import { api } from './api'

export type StatusCobranca = 'aguardando' | 'enviada' | 'paga' | 'vencida' | 'cancelada'

export interface Cobranca {
  id: string
  alunoId: string
  pagamentoId?: string
  valor: number
  vencimento: string
  status: StatusCobranca
  descricao?: string
  nossoNumero?: string
  linhaDigitavel?: string
  boletoUrl?: string | null
  pixChave?: string | null
  criadoEm: string
  pagoEm?: string
  aluno: {
    id: string
    nome: string
    foto?: string
    responsaveis?: Array<{ responsavel: { nome: string; telefone: string | null } }>
  }
  pagamento?: { id: string; mesReferencia: string }
}

export const cobrancasService = {
  listar: (params?: {
    alunoId?: string
    status?: string
    dataInicio?: string
    dataFim?: string
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/cobrancas', { params }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: Cobranca }>(`/cobrancas/${id}`),

  criar: (data: { alunoId: string; pagamentoId?: string; valor: number; vencimento: string; descricao?: string }) =>
    api.post<{ success: boolean; data: Cobranca }>('/cobrancas', data),

  atualizar: (id: string, data: Partial<{ status: StatusCobranca; descricao: string; nossoNumero: string; linhaDigitavel: string }>) =>
    api.put<{ success: boolean; data: Cobranca }>(`/cobrancas/${id}`, data),

  registrarPagamento: (id: string, pagoEm?: string) =>
    api.patch<{ success: boolean; data: Cobranca }>(`/cobrancas/${id}/pagar`, { pagoEm }),

  cancelar: (id: string) =>
    api.patch<{ success: boolean; data: Cobranca }>(`/cobrancas/${id}/cancelar`, {}),
}
