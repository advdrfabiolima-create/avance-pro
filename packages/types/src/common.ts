export type UUID = string

export type Perfil = 'franqueado' | 'assistente'

export type DiaSemana =
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'

export type FormaPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro'

export type CodigoMateria = 'MAT' | 'PORT' | 'ING'

// Níveis do método Kumon em ordem progressiva
export const NIVEIS_KUMON = [
  '6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D',
  'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'
] as const

export type NivelKumon = typeof NIVEIS_KUMON[number]

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
