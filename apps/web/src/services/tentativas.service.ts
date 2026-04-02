import { api } from './api'

export interface RespostaAluno {
  id: string
  questaoId: string
  alternativaId?: string
  valorNumerico?: number
  textoResposta?: string
  correta?: boolean
  pontosObtidos?: number
  questao: { id: string; enunciado: string; tipo: string; pontos: number }
  alternativa?: { id: string; letra: string; texto: string }
}

export interface Tentativa {
  id: string
  alunoId: string
  exercicioId: string
  iniciadaEm: string
  finalizadaEm?: string
  pontuacao?: number
  totalPontos?: number
  corrigida: boolean
  aluno: { id: string; nome: string; foto?: string }
  exercicio: any
  respostasAluno?: RespostaAluno[]
}

export interface ErroRecorrente {
  id: string
  alunoId: string
  questaoId: string
  contagem: number
  ultimaOcorrencia: string
  resolvido: boolean
  questao: {
    id: string
    enunciado: string
    tipo: string
    exercicio: { id: string; titulo: string; materia?: { nome: string; codigo: string } }
  }
}

export interface SugestaoReforco {
  id: string
  alunoId: string
  texto: string
  criadoEm: string
  visualizada: boolean
  erroRecorrente: {
    questao: {
      id: string
      enunciado: string
      tipo: string
      exercicio: { id: string; titulo: string }
    }
  }
}

export const tentativasService = {
  listar: (params?: {
    alunoId?: string
    exercicioId?: string
    corrigida?: boolean
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/tentativas', { params }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: Tentativa }>(`/tentativas/${id}`),

  iniciar: (data: { alunoId: string; exercicioId: string }) =>
    api.post<{ success: boolean; data: Tentativa }>('/tentativas', data),

  submeter: (id: string, respostas: Array<{
    questaoId: string
    alternativaId?: string
    valorNumerico?: number
    textoResposta?: string
  }>) => api.post<{ success: boolean; data: Tentativa }>(`/tentativas/${id}/submeter`, { respostas }),

  errosRecorrentes: (alunoId: string) =>
    api.get<{ success: boolean; data: ErroRecorrente[] }>(`/tentativas/aluno/${alunoId}/erros`),

  sugestoes: (alunoId: string) =>
    api.get<{ success: boolean; data: SugestaoReforco[] }>(`/tentativas/aluno/${alunoId}/sugestoes`),

  marcarSugestaoVisualizada: (id: string) =>
    api.patch(`/tentativas/sugestoes/${id}/visualizar`),
}
