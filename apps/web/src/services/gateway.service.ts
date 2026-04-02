import { api } from './api'

export interface ConfigGateway {
  id: string
  tipo: string
  ambiente: string
  ativo: boolean
  apiKeyMasked: string | null
  criadoEm: string
}

export const gatewayService = {
  buscar: () =>
    api.get<{ success: boolean; data: ConfigGateway | null }>('/config-gateway'),

  salvar: (data: { tipo: string; ambiente: string; apiKey: string }) =>
    api.put<{ success: boolean; data: ConfigGateway }>('/config-gateway', data),

  testar: (data: { apiKey: string; ambiente: string }) =>
    api.post<{ success: boolean; data: { nome: string; email: string } }>('/config-gateway/testar', data),

  desativar: () =>
    api.delete('/config-gateway'),

  enviarCobranca: (id: string, tipo: 'PIX' | 'BOLETO') =>
    api.post<{ success: boolean; data: any }>(`/cobrancas/${id}/enviar`, { tipo }),
}
