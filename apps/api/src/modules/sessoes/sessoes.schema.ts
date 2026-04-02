import { z } from 'zod'

const statusSessaoEnum = z.enum(['avancando_bem', 'atencao', 'estagnado', 'critico'])

export const criarSessaoSchema = z.object({
  turmaId: z.string().uuid(),
  data: z.string().transform((s) => new Date(s)),
  assistenteId: z.string().uuid(),
  observacoes: z.string().optional(),
  alunos: z.array(
    z.object({
      alunoId: z.string().uuid(),
      matriculaId: z.string().uuid(),
      presente: z.boolean(),
      folhasFeitas: z.number().int().min(0).optional(),
      acertos: z.number().int().min(0).optional(),
      erros: z.number().int().min(0).optional(),
      tempoMinutos: z.number().int().min(0).optional(),
      nivelId: z.string().uuid().optional(),
      materialCodigo: z.string().max(20).optional(),
      statusSessao: statusSessaoEnum.optional(),
      observacao: z.string().optional(),
    }),
  ),
})

export const filtrosSessaoSchema = z.object({
  turmaId: z.string().uuid().optional(),
  alunoId: z.string().uuid().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CriarSessaoInput = z.infer<typeof criarSessaoSchema>
export type FiltrosSessaoInput = z.infer<typeof filtrosSessaoSchema>
