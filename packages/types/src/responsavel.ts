import type { UUID } from './common'

export interface Responsavel {
  id: UUID
  nome: string
  cpf: string
  email: string
  telefone: string
  telefoneAlt?: string
  criadoEm: Date
}

export interface ResponsavelCreate {
  nome: string
  cpf: string
  email: string
  telefone: string
  telefoneAlt?: string
}

export interface ResponsavelUpdate {
  nome?: string
  email?: string
  telefone?: string
  telefoneAlt?: string
}
