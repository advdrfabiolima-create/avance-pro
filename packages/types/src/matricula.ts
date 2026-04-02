import type { UUID, NivelKumon, CodigoMateria } from './common'

export interface Materia {
  id: UUID
  nome: string
  codigo: CodigoMateria
}

export interface Nivel {
  id: UUID
  materiaId: UUID
  codigo: NivelKumon
  descricao: string
  ordem: number
}

export interface Matricula {
  id: UUID
  alunoId: UUID
  materiaId: UUID
  nivelAtualId: UUID
  dataInicio: Date
  dataFim?: Date
  ativo: boolean
  materia?: Materia
  nivelAtual?: Nivel
}

export interface MatriculaCreate {
  alunoId: UUID
  materiaId: UUID
  nivelInicialId: UUID
  dataInicio: Date
}

export interface ProgressaoNivel {
  id: UUID
  matriculaId: UUID
  nivelAnteriorId: UUID
  nivelNovoId: UUID
  data: Date
  usuarioId: UUID
  motivo?: string
  nivelAnterior?: Nivel
  nivelNovo?: Nivel
}
