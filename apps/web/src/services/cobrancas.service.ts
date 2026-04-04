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
    responsaveis?: Array<{ responsavel: { nome: string; telefone: string | null; email?: string | null } }>
  }
  pagamento?: { id: string; mesReferencia: string }
}

export interface CobrancaInadimplente extends Cobranca {
  diasAtraso: number
  actionLogs?: Array<{ actionType: string; triggeredAt: string; channel: string; status: string }>
}

export interface ResumoInadimplencia {
  totalCobrancas: number
  totalAlunos: number
  valorTotal: number
  faixas: Array<{ label: string; count: number; valor: number }>
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

  listarInadimplencia: (params?: { faixa?: string; alunoId?: string; page?: number; pageSize?: number }) =>
    api.get<{ success: boolean; data: { data: CobrancaInadimplente[]; total: number; totalPaginas: number } }>('/cobrancas/inadimplencia', { params }),

  resumoInadimplencia: () =>
    api.get<{ success: boolean; data: ResumoInadimplencia }>('/cobrancas/resumo-inadimplencia'),

  enviarEmail: (id: string, subject: string, template: string) =>
    api.post<{ success: boolean }>(`/cobrancas/${id}/enviar-email`, { subject, template }),
}
