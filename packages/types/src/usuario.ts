import type { UUID, Perfil } from './common'

export interface Usuario {
  id: UUID
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criadoEm: Date
}

export interface UsuarioCreate {
  nome: string
  email: string
  senha: string
  perfil: Perfil
}

export interface UsuarioUpdate {
  nome?: string
  email?: string
  perfil?: Perfil
  ativo?: boolean
}

export interface LoginInput {
  email: string
  senha: string
}

export interface AuthResponse {
  token: string
  usuario: Usuario
}
