import type { UUID } from './common'
import type { Responsavel } from './responsavel'
import type { Matricula } from './matricula'

export interface Aluno {
  id: UUID
  nome: string
  dataNascimento: Date
  escola?: string
  serieEscolar?: string
  ativo: boolean
  criadoEm: Date
}

export interface AlunoDetalhado extends Aluno {
  responsaveis: Array<{
    responsavel: Responsavel
    parentesco: string
    principal: boolean
  }>
  matriculas: Matricula[]
}

export interface AlunoCreate {
  nome: string
  dataNascimento: Date
  escola?: string
  serieEscolar?: string
}

export interface AlunoUpdate {
  nome?: string
  dataNascimento?: Date
  escola?: string
  serieEscolar?: string
  ativo?: boolean
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
}

export interface AlunoFiltros {
  ativo?: boolean
  materiaId?: UUID
  turmaId?: UUID
  busca?: string
  page?: number
  pageSize?: number
}
