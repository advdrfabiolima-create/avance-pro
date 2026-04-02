import { api } from './api'

export interface Nivel {
  id: string
  codigo: string
  descricao: string
  ordem: number
}

export interface Materia {
  id: string
  nome: string
  codigo: string
  niveis: Nivel[]
}

export const materiasService = {
  listar: () => api.get<{ success: boolean; data: Materia[] }>('/materias'),
}
