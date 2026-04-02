import { api } from './api'

export interface ConfigEmpresa {
  id: string
  nome: string
  cnpj: string | null
  logo: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  atualizadoEm: string
}

export type ConfigEmpresaInput = Omit<ConfigEmpresa, 'id' | 'atualizadoEm'>

export const empresaService = {
  buscar: () =>
    api.get<{ success: boolean; data: ConfigEmpresa | null }>('/config-empresa'),

  salvar: (data: ConfigEmpresaInput) =>
    api.put<{ success: boolean; data: ConfigEmpresa }>('/config-empresa', data),
}
