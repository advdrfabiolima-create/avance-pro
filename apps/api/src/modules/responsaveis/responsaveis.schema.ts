import { z } from 'zod'

export const criarResponsavelSchema = z.object({
  nome: z.string().min(2).max(100),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  email: z.string().email(),
  telefone: z.string().min(10).max(20),
  telefoneAlt: z.string().min(10).max(20).optional(),
})

export const atualizarResponsavelSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(10).max(20).optional(),
  telefoneAlt: z.string().min(10).max(20).optional(),
})

export const vincularAlunoSchema = z.object({
  alunoId: z.string().uuid(),
  parentesco: z.string().min(2).max(50),
  principal: z.boolean().default(false),
})

export const filtrosResponsavelSchema = z.object({
  busca: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarResponsavelInput = z.infer<typeof criarResponsavelSchema>
export type AtualizarResponsavelInput = z.infer<typeof atualizarResponsavelSchema>
export type VincularAlunoInput = z.infer<typeof vincularAlunoSchema>
export type FiltrosResponsavelInput = z.infer<typeof filtrosResponsavelSchema>
