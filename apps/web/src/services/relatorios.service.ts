import { api } from './api'

export const relatoriosService = {
  cobranca: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<{ success: boolean; data: any }>('/relatorios/cobranca', { params }),

  fluxoCaixa: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<{ success: boolean; data: any }>('/relatorios/fluxo-caixa', { params }),

  resumo: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<{ success: boolean; data: any }>('/relatorios/resumo', { params }),

  inadimplencia: () =>
    api.get<{ success: boolean; data: any }>('/relatorios/inadimplencia'),
}
