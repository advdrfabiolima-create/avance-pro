import { z } from 'zod'

export const criarReuniaoSchema = z.object({
  alunoId: z.string().uuid(),
  responsavelId: z.string().uuid().optional(),
  usuarioId: z.string().uuid(),
  data: z.string().transform((s) => new Date(s)),
  descricao: z.string().min(1).max(5000),
  tipo: z.enum(['geral', 'desempenho', 'financeiro', 'comportamento', 'outro']).default('geral'),
})

export const atualizarReuniaoSchema = z.object({
  data: z.string().transform((s) => new Date(s)).optional(),
  descricao: z.string().min(1).max(5000).optional(),
  tipo: z.enum(['geral', 'desempenho', 'financeiro', 'comportamento', 'outro']).optional(),
  responsavelId: z.string().uuid().nullable().optional(),
})

export const filtrosReuniaoSchema = z.object({
  alunoId: z.string().uuid().optional(),
  usuarioId: z.string().uuid().optional(),
  tipo: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarReuniaoInput = z.infer<typeof criarReuniaoSchema>
export type AtualizarReuniaoInput = z.infer<typeof atualizarReuniaoSchema>
export type FiltrosReuniaoInput = z.infer<typeof filtrosReuniaoSchema>
