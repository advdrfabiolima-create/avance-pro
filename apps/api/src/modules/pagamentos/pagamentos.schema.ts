import { z } from 'zod'

export const criarPagamentoSchema = z.object({
  alunoId: z.string().uuid(),
  matriculaId: z.string().uuid(),
  responsavelId: z.string().uuid(),
  mesReferencia: z.string().transform((s) => new Date(s)),
  valor: z.number().positive(),
  vencimento: z.string().transform((s) => new Date(s)),
  observacao: z.string().optional(),
})

export const gerarMensalidadesSchema = z.object({
  materiaId: z.string().uuid(),
  mesReferencia: z.string().transform((s) => new Date(s)),
  valor: z.number().positive(),
  diaVencimento: z.number().int().min(1).max(28),
})

export const registrarPagamentoSchema = z.object({
  pagoEm: z.string().transform((s) => new Date(s)),
  formaPagamento: z.enum(['pix', 'cartao', 'boleto', 'dinheiro']),
  observacao: z.string().optional(),
})

export const filtrosPagamentoSchema = z.object({
  status: z.enum(['pendente', 'pago', 'vencido']).optional(),
  mes: z.string().optional(),
  alunoId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarPagamentoInput = z.infer<typeof criarPagamentoSchema>
export type GerarMensalidadesInput = z.infer<typeof gerarMensalidadesSchema>
export type RegistrarPagamentoInput = z.infer<typeof registrarPagamentoSchema>
export type FiltrosPagamentoInput = z.infer<typeof filtrosPagamentoSchema>
