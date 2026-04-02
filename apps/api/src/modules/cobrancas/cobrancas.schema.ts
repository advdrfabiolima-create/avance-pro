import { z } from 'zod'

export const criarCobrancaSchema = z.object({
  alunoId: z.string().uuid(),
  pagamentoId: z.string().uuid().optional(),
  valor: z.number().positive(),
  vencimento: z.string().transform((s) => new Date(s)),
  descricao: z.string().max(255).optional(),
})

export const atualizarCobrancaSchema = z.object({
  status: z.enum(['aguardando', 'enviada', 'paga', 'vencida', 'cancelada']).optional(),
  pagoEm: z.string().transform((s) => new Date(s)).optional(),
  descricao: z.string().max(255).optional(),
  nossoNumero: z.string().max(50).optional(),
  linhaDigitavel: z.string().max(100).optional(),
})

export const filtrosCobrancaSchema = z.object({
  alunoId: z.string().uuid().optional(),
  status: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarCobrancaInput = z.infer<typeof criarCobrancaSchema>
export type AtualizarCobrancaInput = z.infer<typeof atualizarCobrancaSchema>
export type FiltrosCobrancaInput = z.infer<typeof filtrosCobrancaSchema>
