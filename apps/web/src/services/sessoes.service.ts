import { api } from './api'

export interface SessaoLista {
  id: string
  data: string
  turmaId: string
  turma: { diaSemana: string; horarioInicio: string; horarioFim: string }
  presentes: number
  ausentes: number
  mediaAcertos: number | null
  mediaErros: number | null
  mediaTempo: number | null
}

export interface SessaoDetalhada {
  id: string
  data: string
  observacoes?: string
  turma: { id: string; diaSemana: string; horarioInicio: string; horarioFim: string }
  assistente: { id: string; nome: string; email: string }
  alunos: Array<{
    id: string
    alunoId: string
    aluno: { id: string; nome: string }
    presente: boolean
    folhasFeitas?: number
    erros?: number
    tempoMinutos?: number
    observacao?: string
    nivel?: { id: string; codigo: string; descricao: string }
  }>
}

export const sessoesService = {
  listar: (params: { turmaId?: string; alunoId?: string; dataInicio?: string; dataFim?: string; page?: number; pageSize?: number }) =>
    api.get<any>('/sessoes', { params }),

  buscarPorId: (id: string) => api.get<any>(`/sessoes/${id}`),

  criar: (data: { turmaId: string; data: string; assistenteId: string; observacoes?: string; alunos: Array<{ alunoId: string; matriculaId: string; presente: boolean; folhasFeitas?: number; erros?: number; tempoMinutos?: number; nivelId?: string; observacao?: string }> }) =>
    api.post<any>('/sessoes', data),
}
