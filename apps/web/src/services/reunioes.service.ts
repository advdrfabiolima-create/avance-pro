import { api } from './api'

export interface Reuniao {
  id: string
  alunoId: string
  responsavelId?: string
  usuarioId: string
  data: string
  descricao: string
  tipo: 'geral' | 'desempenho' | 'financeiro' | 'comportamento' | 'outro'
  criadoEm: string
  aluno: { id: string; nome: string; foto?: string }
  responsavel?: { id: string; nome: string; telefone: string }
  usuario: { id: string; nome: string; perfil: string }
}

export const reunioesService = {
  listar: (params?: {
    alunoId?: string
    tipo?: string
    dataInicio?: string
    dataFim?: string
    page?: number
    pageSize?: number
  }) => api.get<{ success: boolean; data: any }>('/reunioes', { params }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: Reuniao }>(`/reunioes/${id}`),

  criar: (data: {
    alunoId: string
    responsavelId?: string
    usuarioId: string
    data: string
    descricao: string
    tipo?: string
  }) => api.post<{ success: boolean; data: Reuniao }>('/reunioes', data),

  atualizar: (id: string, data: Partial<{ data: string; descricao: string; tipo: string; responsavelId: string | null }>) =>
    api.put<{ success: boolean; data: Reuniao }>(`/reunioes/${id}`, data),

  excluir: (id: string) => api.delete(`/reunioes/${id}`),
}
