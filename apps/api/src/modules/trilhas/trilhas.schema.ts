import { z } from 'zod'

const disciplinas = ['matematica', 'portugues', 'ingles'] as const
const statusBib = ['rascunho', 'publicado', 'arquivado'] as const

export const criarTrilhaSchema = z.object({
  nome: z.string().min(1).max(200),
  disciplina: z.enum(disciplinas),
  descricao: z.string().optional(),
  nivelInicio: z.string().min(1).max(10),
  nivelFim: z.string().min(1).max(10),
  status: z.enum(statusBib).default('rascunho'),
})
export type CriarTrilhaInput = z.infer<typeof criarTrilhaSchema>

export const atualizarTrilhaSchema = criarTrilhaSchema.partial()
export type AtualizarTrilhaInput = z.infer<typeof atualizarTrilhaSchema>

export const filtrosTrilhaSchema = z.object({
  disciplina: z.enum(disciplinas).optional(),
  status: z.enum(statusBib).optional(),
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})
export type FiltrosTrilhaInput = z.infer<typeof filtrosTrilhaSchema>

export const adicionarItemSchema = z.object({
  exercicioId: z.string().uuid(),
  ordemIndex: z.coerce.number().int().min(0).default(0),
})
export type AdicionarItemInput = z.infer<typeof adicionarItemSchema>

export const reordenarItensSchema = z.object({
  itens: z.array(z.object({ id: z.string().uuid(), ordemIndex: z.number().int().min(0) })),
})
export type ReordenarItensInput = z.infer<typeof reordenarItensSchema>
