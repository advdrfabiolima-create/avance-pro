import { z } from 'zod'

export const criarExercicioSchema = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().optional(),
  materiaId: z.string().uuid().optional(),
  nivelId: z.string().uuid().optional(),
})

export const atualizarExercicioSchema = criarExercicioSchema.partial().extend({
  ativo: z.boolean().optional(),
})

export const criarQuestaoSchema = z.object({
  enunciado: z.string().min(1),
  tipo: z.enum(['objetiva', 'numerica', 'discursiva']),
  ordem: z.number().int().default(0),
  pontos: z.number().positive().default(1),
  alternativas: z.array(z.object({
    letra: z.string().length(1),
    texto: z.string().min(1),
  })).optional(),
  respostaCorreta: z.object({
    alternativaId: z.string().uuid().optional(),
    valorNumerico: z.number().optional(),
    tolerancia: z.number().optional(),
    textoEsperado: z.string().optional(),
  }).optional(),
})

export const filtrosExercicioSchema = z.object({
  materiaId: z.string().uuid().optional(),
  nivelId: z.string().uuid().optional(),
  ativo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export type CriarExercicioInput = z.infer<typeof criarExercicioSchema>
export type AtualizarExercicioInput = z.infer<typeof atualizarExercicioSchema>
export type CriarQuestaoInput = z.infer<typeof criarQuestaoSchema>
export type FiltrosExercicioInput = z.infer<typeof filtrosExercicioSchema>
