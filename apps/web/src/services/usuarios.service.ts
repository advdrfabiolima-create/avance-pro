import { api } from './api'
import type { Usuario } from '@kumon-advance/types'

export interface CriarUsuarioData {
  nome: string
  email: string
  senha: string
  perfil: 'franqueado' | 'assistente'
}

export interface AtualizarUsuarioData {
  nome?: string
  email?: string
  perfil?: 'franqueado' | 'assistente'
  ativo?: boolean
}

export interface TrocarSenhaData {
  senhaAtual: string
  novaSenha: string
}

export const usuariosService = {
  listar: () => api.get<{ success: boolean; data: Usuario[] }>('/usuarios'),

  criar: (data: CriarUsuarioData) =>
    api.post<{ success: boolean; data: Usuario }>('/usuarios', data),

  atualizar: (id: string, data: AtualizarUsuarioData) =>
    api.put<{ success: boolean; data: Usuario }>(`/usuarios/${id}`, data),

  trocarSenha: (id: string, data: TrocarSenhaData) =>
    api.post(`/usuarios/${id}/trocar-senha`, data),
}
