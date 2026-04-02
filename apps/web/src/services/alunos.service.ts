import { api } from './api'
import type {
  Aluno,
  AlunoDetalhado,
  AlunoCreate,
  AlunoUpdate,
  AlunoFiltros,
  PaginatedResponse,
} from '@kumon-advance/types'

export const alunosService = {
  listar: (filtros: AlunoFiltros) =>
    api.get<{ success: boolean; data: PaginatedResponse<Aluno> }>('/alunos', { params: filtros }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: AlunoDetalhado }>(`/alunos/${id}`),

  criar: (
    data: AlunoCreate & {
      responsaveis: Array<{ responsavelId: string; parentesco: string; principal: boolean }>
    },
  ) => api.post<{ success: boolean; data: Aluno }>('/alunos', data),

  atualizar: (id: string, data: AlunoUpdate) =>
    api.put<{ success: boolean; data: Aluno }>(`/alunos/${id}`, data),

  desativar: (id: string) => api.delete(`/alunos/${id}`),

  matricular: (alunoId: string, data: { materiaId: string; nivelAtualId: string; dataInicio: string }) =>
    api.post(`/alunos/${alunoId}/matriculas`, data),
}
