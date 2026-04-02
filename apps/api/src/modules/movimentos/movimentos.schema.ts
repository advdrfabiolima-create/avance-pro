import { z } from 'zod'

export const criarMovimentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  origem: z.enum(['mensalidade', 'matricula', 'material', 'salario', 'aluguel', 'servico', 'outro']).default('outro'),
  descricao: z.string().min(1).max(255),
  valor: z.number().positive(),
  data: z.string().transform((s) => new Date(s)),
  status: z.enum(['confirmado', 'pendente', 'cancelado']).default('confirmado'),
  pagamentoId: z.string().uuid().optional(),
  observacao: z.string().optional(),
})

export const atualizarMovimentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']).optional(),
  origem: z.enum(['mensalidade', 'matricula', 'material', 'salario', 'aluguel', 'servico', 'outro']).optional(),
  descricao: z.string().min(1).max(255).optional(),
  valor: z.number().positive().optional(),
  data: z.string().transform((s) => new Date(s)).optional(),
  status: z.enum(['confirmado', 'pendente', 'cancelado']).optional(),
  observacao: z.string().optional(),
})

export const filtrosMovimentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']).optional(),
  origem: z.string().optional(),
  status: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarMovimentoInput = z.infer<typeof criarMovimentoSchema>
export type AtualizarMovimentoInput = z.infer<typeof atualizarMovimentoSchema>
export type FiltrosMovimentoInput = z.infer<typeof filtrosMovimentoSchema>
