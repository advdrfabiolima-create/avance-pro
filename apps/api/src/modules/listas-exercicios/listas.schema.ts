import { z } from 'zod'

const disciplinas = ['matematica', 'portugues', 'ingles'] as const
const statusBib = ['rascunho', 'publicado', 'arquivado'] as const
const destinatarios = ['aluno', 'turma'] as const

export const criarListaSchema = z.object({
  titulo: z.string().min(1).max(200),
  disciplina: z.enum(disciplinas).optional(),
  descricao: z.string().optional(),
  destinatario: z.enum(destinatarios).default('aluno'),
  destinoId: z.string().uuid().optional(),
})
export type CriarListaInput = z.infer<typeof criarListaSchema>

export const atualizarListaSchema = criarListaSchema.partial()
export type AtualizarListaInput = z.infer<typeof atualizarListaSchema>

export const filtrosListaSchema = z.object({
  disciplina: z.enum(disciplinas).optional(),
  status: z.enum(statusBib).optional(),
  destinatario: z.enum(destinatarios).optional(),
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})
export type FiltrosListaInput = z.infer<typeof filtrosListaSchema>

export const adicionarItemListaSchema = z.object({
  exercicioId: z.string().uuid(),
  ordemIndex: z.coerce.number().int().min(0).default(0),
})
export type AdicionarItemListaInput = z.infer<typeof adicionarItemListaSchema>

export const importarTrilhaSchema = z.object({
  trilhaId: z.string().uuid(),
})
export type ImportarTrilhaInput = z.infer<typeof importarTrilhaSchema>

export const reordenarListaSchema = z.object({
  itens: z.array(z.object({ id: z.string().uuid(), ordemIndex: z.number().int().min(0) })),
})
export type ReordenarListaInput = z.infer<typeof reordenarListaSchema>
