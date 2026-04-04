import type { Disciplina, Dificuldade, TipoExercicio, StatusBib, OrigemBib } from '../../services/biblioteca.service'

export const DISCIPLINA_LABEL: Record<Disciplina, string> = {
  matematica: 'Matemática',
  portugues: 'Português',
  ingles: 'Inglês',
}

export const DIFICULDADE_LABEL: Record<Dificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
}

export const TIPO_LABEL: Record<TipoExercicio, string> = {
  objetivo: 'Objetiva',
  numerico: 'Numérica',
  texto: 'Discursiva',
}

export const STATUS_LABEL: Record<StatusBib, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}

export const ORIGEM_LABEL: Record<OrigemBib, string> = {
  manual: 'Manual',
  ia: 'IA',
}

export const STATUS_COLORS: Record<StatusBib, string> = {
  rascunho: 'bg-amber-50 text-amber-700 border border-amber-200',
  publicado: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  arquivado: 'bg-slate-100 text-slate-500 border border-slate-200',
}

export const DIFICULDADE_COLORS: Record<Dificuldade, string> = {
  facil: 'bg-blue-50 text-blue-700 border border-blue-200',
  medio: 'bg-orange-50 text-orange-700 border border-orange-200',
  dificil: 'bg-red-50 text-red-700 border border-red-200',
}

export const DISCIPLINA_COLORS: Record<Disciplina, string> = {
  matematica: 'bg-violet-50 text-violet-700 border border-violet-200',
  portugues: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  ingles: 'bg-green-50 text-green-700 border border-green-200',
}

export const NIVEIS = ['6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']
