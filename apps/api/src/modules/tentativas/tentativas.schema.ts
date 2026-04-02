import { z } from 'zod'

export const criarTentativaSchema = z.object({
  alunoId: z.string().uuid(),
  exercicioId: z.string().uuid(),
})

export const submeterRespostasSchema = z.object({
  respostas: z.array(z.object({
    questaoId: z.string().uuid(),
    alternativaId: z.string().uuid().optional(),
    valorNumerico: z.number().optional(),
    textoResposta: z.string().optional(),
  })),
})

export const filtrosTentativaSchema = z.object({
  alunoId: z.string().uuid().optional(),
  exercicioId: z.string().uuid().optional(),
  corrigida: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type CriarTentativaInput = z.infer<typeof criarTentativaSchema>
export type SubmeterRespostasInput = z.infer<typeof submeterRespostasSchema>
export type FiltrosTentativaInput = z.infer<typeof filtrosTentativaSchema>
