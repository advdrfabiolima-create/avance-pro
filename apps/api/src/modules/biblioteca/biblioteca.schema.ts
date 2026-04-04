import { z } from 'zod'

export const disciplinas = ['matematica', 'portugues', 'ingles'] as const
export const dificuldades = ['facil', 'medio', 'dificil'] as const
export const tipos = ['objetivo', 'numerico', 'texto'] as const
export const statusBib = ['rascunho', 'publicado', 'arquivado'] as const
export const origens = ['manual', 'ia'] as const

export const criarExercicioSchema = z.object({
  disciplina: z.enum(disciplinas),
  topico: z.string().min(1).max(100),
  subtopico: z.string().max(100).optional(),
  nivel: z.string().min(1).max(10),
  dificuldade: z.enum(dificuldades),
  tipo: z.enum(tipos),
  enunciado: z.string().min(5),
  opcoes: z.array(z.string()).min(2).max(6).optional().nullable(),
  resposta: z.string().min(1),
  explicacao: z.string().min(5),
  tags: z.array(z.string()).default([]),
  status: z.enum(statusBib).default('rascunho'),
})
export type CriarExercicioInput = z.infer<typeof criarExercicioSchema>

export const atualizarExercicioSchema = criarExercicioSchema.partial()
export type AtualizarExercicioInput = z.infer<typeof atualizarExercicioSchema>

export const filtrosExercicioSchema = z.object({
  disciplina: z.enum(disciplinas).optional(),
  topico: z.string().optional(),
  nivel: z.string().optional(),
  dificuldade: z.enum(dificuldades).optional(),
  tipo: z.enum(tipos).optional(),
  status: z.enum(statusBib).optional(),
  origem: z.enum(origens).optional(),
  busca: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})
export type FiltrosExercicioInput = z.infer<typeof filtrosExercicioSchema>

export const gerarIaSchema = z.object({
  disciplina: z.enum(disciplinas),
  topico: z.string().min(1),
  subtopico: z.string().optional(),
  nivel: z.string().min(1),
  dificuldade: z.enum(dificuldades),
  tipo: z.enum(tipos),
  quantidade: z.coerce.number().int().min(1).max(10).default(3),
})
export type GerarIaInput = z.infer<typeof gerarIaSchema>

export const salvarGeradosSchema = z.object({
  exercicios: z.array(criarExercicioSchema.extend({ origem: z.literal('ia').default('ia') })).min(1),
})
export type SalvarGeradosInput = z.infer<typeof salvarGeradosSchema>

export const revisarExercicioSchema = z.object({
  acao: z.enum(['publicar', 'arquivar']),
})
export type RevisarExercicioInput = z.infer<typeof revisarExercicioSchema>
