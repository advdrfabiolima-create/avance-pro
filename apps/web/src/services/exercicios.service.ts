import { api } from './api'

export interface Exercicio {
  id: string
  titulo: string
  descricao?: string
  materiaId?: string
  nivelId?: string
  ativo: boolean
  criadoEm: string
  materia?: { id: string; nome: string; codigo: string }
  nivel?: { id: string; codigo: string; descricao: string }
  _count?: { questoes: number; tentativas: number }
}

export interface Alternativa {
  id: string
  questaoId: string
  letra: string
  texto: string
}

export interface RespostaCorreta {
  id: string
  questaoId: string
  alternativaId?: string
  valorNumerico?: number
  tolerancia?: number
  textoEsperado?: string
}

export interface Questao {
  id: string
  exercicioId: string
  enunciado: string
  tipo: 'objetiva' | 'numerica' | 'discursiva'
  ordem: number
  pontos: number
  alternativas: Alternativa[]
  respostaCorreta?: RespostaCorreta
}

export interface ExercicioDetalhe extends Exercicio {
  questoes: Questao[]
}

export const exerciciosService = {
  listar: (params?: {
    materiaId?: string
    nivelId?: string
    ativo?: boolean
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/exercicios', { params }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: ExercicioDetalhe }>(`/exercicios/${id}`),

  criar: (data: {
    titulo: string
    descricao?: string
    materiaId?: string
    nivelId?: string
  }) => api.post<{ success: boolean; data: Exercicio }>('/exercicios', data),

  atualizar: (id: string, data: Partial<{
    titulo: string
    descricao: string
    materiaId: string
    nivelId: string
    ativo: boolean
  }>) => api.put<{ success: boolean; data: Exercicio }>(`/exercicios/${id}`, data),

  excluir: (id: string) => api.delete(`/exercicios/${id}`),

  adicionarQuestao: (exercicioId: string, data: {
    enunciado: string
    tipo: 'objetiva' | 'numerica' | 'discursiva'
    ordem?: number
    pontos?: number
    alternativas?: Array<{ letra: string; texto: string }>
    respostaCorreta?: {
      alternativaId?: string
      valorNumerico?: number
      tolerancia?: number
      textoEsperado?: string
    }
  }) => api.post<{ success: boolean; data: Questao }>(`/exercicios/${exercicioId}/questoes`, data),

  atualizarQuestao: (exercicioId: string, questaoId: string, data: any) =>
    api.put<{ success: boolean; data: Questao }>(`/exercicios/${exercicioId}/questoes/${questaoId}`, data),

  removerQuestao: (exercicioId: string, questaoId: string) =>
    api.delete(`/exercicios/${exercicioId}/questoes/${questaoId}`),
}
