import type { UUID, DiaSemana } from './common'

export type StatusSessao = 'avancando_bem' | 'atencao' | 'estagnado' | 'critico'

export interface Turma {
  id: UUID
  diaSemana: DiaSemana
  horarioInicio: string
  horarioFim: string
  capacidade: number
}

export interface Sessao {
  id: UUID
  turmaId: UUID
  data: Date
  assistenteId: UUID
  observacoes?: string
  criadoEm: Date
}

export interface SessaoAluno {
  id: UUID
  sessaoId: UUID
  alunoId: UUID
  matriculaId: UUID
  presente: boolean
  folhasFeitas?: number
  acertos?: number
  erros?: number
  tempoMinutos?: number
  nivelId?: UUID
  materialCodigo?: string
  statusSessao?: StatusSessao
  observacao?: string
}

export interface SessaoCreate {
  turmaId: UUID
  data: Date
  assistenteId: UUID
  observacoes?: string
  alunos: SessaoAlunoInput[]
}

export interface SessaoAlunoInput {
  alunoId: UUID
  matriculaId: UUID
  presente: boolean
  folhasFeitas?: number
  acertos?: number
  erros?: number
  tempoMinutos?: number
  nivelId?: UUID
  materialCodigo?: string
  statusSessao?: StatusSessao
  observacao?: string
}
