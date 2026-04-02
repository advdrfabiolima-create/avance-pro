import type { UUID, FormaPagamento } from './common'

export type StatusPagamento = 'pendente' | 'pago' | 'vencido'

export interface Pagamento {
  id: UUID
  alunoId: UUID
  matriculaId: UUID
  responsavelId: UUID
  mesReferencia: Date
  valor: number
  vencimento: Date
  pagoEm?: Date
  formaPagamento?: FormaPagamento
  observacao?: string
  status: StatusPagamento
}

export interface PagamentoCreate {
  alunoId: UUID
  matriculaId: UUID
  responsavelId: UUID
  mesReferencia: Date
  valor: number
  vencimento: Date
  observacao?: string
}

export interface PagamentoRegistrar {
  pagoEm: Date
  formaPagamento: FormaPagamento
  observacao?: string
}

export interface PagamentoFiltros {
  status?: StatusPagamento
  mes?: Date
  alunoId?: UUID
  page?: number
  pageSize?: number
}
