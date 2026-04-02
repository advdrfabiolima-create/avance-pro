import { z } from 'zod'

export const criarRecorrenciaSchema = z.object({
  nome: z.string().min(1).max(100),
  valor: z.number().positive(),
  periodicidade: z.enum(['mensal', 'bimestral', 'trimestral', 'semestral', 'anual']),
  diaVencimento: z.number().int().min(1).max(28),
  dataInicio: z.string().transform((s) => new Date(s)),
  dataFim: z.string().transform((s) => new Date(s)).optional(),
  descricao: z.string().max(255).optional(),
})

export const atualizarRecorrenciaSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  valor: z.number().positive().optional(),
  diaVencimento: z.number().int().min(1).max(28).optional(),
  dataFim: z.string().transform((s) => new Date(s)).nullable().optional(),
  ativo: z.boolean().optional(),
  descricao: z.string().max(255).optional(),
})

export type CriarRecorrenciaInput = z.infer<typeof criarRecorrenciaSchema>
export type AtualizarRecorrenciaInput = z.infer<typeof atualizarRecorrenciaSchema>
