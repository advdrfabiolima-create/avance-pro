import { z } from 'zod'

export const criarTurmaSchema = z.object({
  diaSemana: z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  capacidade: z.number().int().min(1).max(50),
})

export const atualizarTurmaSchema = z.object({
  diaSemana: z.enum(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']).optional(),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional(),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM').optional(),
  capacidade: z.number().int().min(1).max(50).optional(),
})

export const adicionarAlunoSchema = z.object({
  alunoId: z.string().uuid(),
  dataInicio: z.string().transform((s) => new Date(s)),
})

export type CriarTurmaInput = z.infer<typeof criarTurmaSchema>
export type AtualizarTurmaInput = z.infer<typeof atualizarTurmaSchema>
export type AdicionarAlunoInput = z.infer<typeof adicionarAlunoSchema>
