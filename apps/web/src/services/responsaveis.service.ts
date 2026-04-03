import { api } from './api'
import type {
  Responsavel,
  ResponsavelCreate,
  ResponsavelUpdate,
  PaginatedResponse,
} from '@kumon-advance/types'

export interface ResponsavelComAlunos extends Responsavel {
  alunos: Array<{
    aluno: { id: string; nome: string }
    parentesco: string
    principal: boolean
  }>
}

export interface ListarParams {
  busca?: string
  page?: number
  pageSize?: number
}

export const responsaveisService = {
  listar: (params: ListarParams) =>
    api.get<PaginatedResponse<ResponsavelComAlunos>>('/responsaveis', { params }),

  buscarPorId: (id: string) =>
    api.get<ResponsavelComAlunos>(`/responsaveis/${id}`),

  criar: (data: ResponsavelCreate) =>
    api.post<Responsavel>('/responsaveis', data),

  atualizar: (id: string, data: ResponsavelUpdate) =>
    api.put<Responsavel>(`/responsaveis/${id}`, data),

  excluir: (id: string) =>
    api.delete(`/responsaveis/${id}`),

  vincularAluno: (
    responsavelId: string,
    body: { alunoId: string; parentesco: string; principal: boolean },
  ) => api.post(`/responsaveis/${responsavelId}/alunos`, body),

  desvincularAluno: (responsavelId: string, alunoId: string) =>
    api.delete(`/responsaveis/${responsavelId}/alunos/${alunoId}`),
}
