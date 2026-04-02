import { api } from './api'

export const presencaService = {
  listarPorData: (params: { data?: string; turmaId?: string; semana?: string }) =>
    api.get<{ success: boolean; data: any }>('/presenca', { params }),

  quadroHorarios: () =>
    api.get<{ success: boolean; data: any }>('/presenca/quadro'),

  marcarPresenca: (sessaoAlunoId: string, presente: boolean) =>
    api.patch<{ success: boolean; data: any }>('/presenca/marcar', { sessaoAlunoId, presente }),
}
