import { z } from 'zod'

export const criarAlunoSchema = z.object({
  nome: z.string().min(2).max(100),
  dataNascimento: z.string().transform((s) => new Date(s)),
  escola: z.string().max(150).optional(),
  serieEscolar: z.string().max(50).optional(),
  cadastradoKsis: z.boolean().optional(),
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

const enderecoSchema = {
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido').optional(),
  logradouro: z.string().max(200).optional(),
  numero: z.string().max(20).optional(),
  complemento: z.string().max(100).optional(),
  bairro: z.string().max(100).optional(),
  cidade: z.string().max(100).optional(),
  estado: z.string().length(2).optional(),
}

export const atualizarAlunoSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  dataNascimento: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  escola: z.string().max(150).optional(),
  serieEscolar: z.string().max(50).optional(),
  foto: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  cadastradoKsis: z.boolean().optional(),
  ...enderecoSchema,
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
