import { z } from 'zod'

export const criarNotaFiscalSchema = z.object({
  alunoId: z.string().uuid(),
  responsavelId: z.string().uuid().optional(),
  valor: z.number().positive(),
  competencia: z.string().transform((s) => new Date(s)),
  descricao: z.string().max(255).optional(),
})

export const atualizarNotaFiscalSchema = z.object({
  numero: z.string().max(50).optional(),
  status: z.enum(['rascunho', 'emitida', 'cancelada']).optional(),
  descricao: z.string().max(255).optional(),
  xmlUrl: z.string().max(500).optional(),
})

export const filtrosNotaFiscalSchema = z.object({
  alunoId: z.string().uuid().optional(),
  status: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarNotaFiscalInput = z.infer<typeof criarNotaFiscalSchema>
export type AtualizarNotaFiscalInput = z.infer<typeof atualizarNotaFiscalSchema>
export type FiltrosNotaFiscalInput = z.infer<typeof filtrosNotaFiscalSchema>
