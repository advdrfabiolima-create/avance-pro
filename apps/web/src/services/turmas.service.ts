import { api } from './api'
import type { DiaSemana } from '@kumon-advance/types'

export interface Turma {
  id: string
  diaSemana: DiaSemana
  horarioInicio: string
  horarioFim: string
  capacidade: number
  alunos: Array<{
    aluno: { id: string; nome: string }
    dataInicio: string
  }>
}

export interface TurmaCreate {
  diaSemana: DiaSemana
  horarioInicio: string
  horarioFim: string
  capacidade: number
}

export interface TurmaUpdate {
  diaSemana?: DiaSemana
  horarioInicio?: string
  horarioFim?: string
  capacidade?: number
}

export const turmasService = {
  listar: () => api.get<Turma[]>('/turmas'),

  buscarPorId: (id: string) => api.get<Turma>(`/turmas/${id}`),

  criar: (data: TurmaCreate) => api.post<Turma>('/turmas', data),

  atualizar: (id: string, data: TurmaUpdate) =>
    api.put<Turma>(`/turmas/${id}`, data),

  adicionarAluno: (
    turmaId: string,
    body: { alunoId: string; dataInicio: string },
  ) => api.post(`/turmas/${turmaId}/alunos`, body),

  removerAluno: (turmaId: string, alunoId: string) =>
    api.delete(`/turmas/${turmaId}/alunos/${alunoId}`),
}
