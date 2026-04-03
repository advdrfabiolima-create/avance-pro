import { api } from './api'

export interface TentativaOcrResumo {
  id: string
  status: 'pendente' | 'processando' | 'revisao' | 'confirmado' | 'erro'
  criadoEm: string
  alunoId: string
  exercicioId: string
  tentativaId: string | null
  aluno: { id: string; nome: string }
  exercicio: { id: string; titulo: string }
  _count: { respostasDetectadas: number }
}

export interface RespostaOcrDetectada {
  id: string
  tentativaOcrId: string
  questaoOrdem: number
  questaoId: string | null
  tipoDetectado: 'objetiva' | 'numerica'
  letraDetectada: string | null
  valorDetectado: number | null
  confianca: number | null
  confirmada: boolean
}

export interface TentativaOcrCompleta {
  id: string
  alunoId: string
  exercicioId: string
  imagemBase64: string
  textoOcr: string | null
  status: 'pendente' | 'processando' | 'revisao' | 'confirmado' | 'erro'
  erroMensagem: string | null
  tentativaId: string | null
  criadoEm: string
  aluno: { id: string; nome: string; foto: string | null }
  exercicio: {
    id: string
    titulo: string
    materia: { nome: string; codigo: string } | null
    nivel: { codigo: string; descricao: string } | null
    questoes: Array<{
      id: string
      ordem: number
      enunciado: string
      tipo: 'objetiva' | 'numerica' | 'discursiva'
      pontos: number
      alternativas: Array<{ id: string; letra: string; texto: string }>
      respostaCorreta: {
        alternativaId: string | null
        valorNumerico: number | null
        tolerancia: number | null
      } | null
    }>
  }
  respostasDetectadas: RespostaOcrDetectada[]
}

export const ocrService = {
  criar: (data: { alunoId: string; exercicioId: string; imagemBase64: string }) =>
    api.post<{ success: boolean; data: { id: string } }>('/ocr', data),

  processar: (id: string) =>
    api.post<{ success: boolean; data: TentativaOcrCompleta }>(`/ocr/${id}/processar`),

  buscar: (id: string) =>
    api.get<{ success: boolean; data: TentativaOcrCompleta }>(`/ocr/${id}`),

  listar: (alunoId?: string) =>
    api.get<{ success: boolean; data: { items: TentativaOcrResumo[]; total: number } }>('/ocr', {
      params: alunoId ? { alunoId } : undefined,
    }),

  atualizarRespostas: (
    id: string,
    respostas: Array<{
      respostaOcrId: string
      letraDetectada?: string | null
      valorDetectado?: number | null
      confirmada: boolean
    }>
  ) =>
    api.put<{ success: boolean; data: TentativaOcrCompleta }>(`/ocr/${id}/respostas`, { respostas }),

  confirmar: (id: string) =>
    api.post<{ success: boolean; data: { tentativaId: string } }>(`/ocr/${id}/confirmar`),
}
