import { api } from './api'

export const pagamentosService = {
  listar: (params: { status?: 'pendente' | 'pago' | 'vencido'; mes?: string; alunoId?: string; page?: number; pageSize?: number }) =>
    api.get<any>('/pagamentos', { params }),

  registrarPagamento: (id: string, data: { pagoEm: string; formaPagamento: 'pix' | 'cartao' | 'boleto' | 'dinheiro'; observacao?: string }) =>
    api.patch<any>(`/pagamentos/${id}/registrar`, data),

  gerarMensalidades: (data: { materiaId: string; mesReferencia: string; valor: number; diaVencimento: number }) =>
    api.post<any>('/pagamentos/gerar-mensalidades', data),

  listarInadimplentes: () => api.get<any>('/pagamentos/inadimplentes'),
}
