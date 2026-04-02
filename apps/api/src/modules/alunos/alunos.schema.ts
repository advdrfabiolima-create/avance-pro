import { z } from 'zod'

export const criarAlunoSchema = z.object({
  nome: z.string().min(2).max(100),
  dataNascimento: z.string().transform((s) => new Date(s)),
  escola: z.string().max(150).optional(),
  serieEscolar: z.string().max(50).optional(),
  responsaveis: z
    .array(
      z.object({
        responsavelId: z.string().uuid(),
        parentesco: z.string().min(2).max(50),
        principal: z.boolean().default(false),
      }),
    )
    .min(1),
})

export const atualizarAlunoSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  dataNascimento: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  escola: z.string().max(150).optional(),
  serieEscolar: z.string().max(50).optional(),
  foto: z.string().nullable().optional(),
})

export const filtrosAlunoSchema = z.object({
  ativo: z.coerce.boolean().optional(),
  materiaId: z.string().uuid().optional(),
  turmaId: z.string().uuid().optional(),
  busca: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarAlunoInput = z.infer<typeof criarAlunoSchema>
export type AtualizarAlunoInput = z.infer<typeof atualizarAlunoSchema>
export type FiltrosAlunoInput = z.infer<typeof filtrosAlunoSchema>
