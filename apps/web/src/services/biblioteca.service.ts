import { api } from './api'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type Disciplina = 'matematica' | 'portugues' | 'ingles'
export type Dificuldade = 'facil' | 'medio' | 'dificil'
export type TipoExercicio = 'objetivo' | 'numerico' | 'texto'
export type StatusBib = 'rascunho' | 'publicado' | 'arquivado'
export type OrigemBib = 'manual' | 'ia'
export type Destinatario = 'aluno' | 'turma'

export interface BibExercicio {
  id: string
  disciplina: Disciplina
  topico: string
  subtopico?: string
  nivel: string
  dificuldade: Dificuldade
  tipo: TipoExercicio
  enunciado: string
  opcoes?: string[] | null
  resposta: string
  explicacao: string
  tags: string[]
  origem: OrigemBib
  status: StatusBib
  criadoPorId?: string
  revisadoPorId?: string
  criadoEm: string
  atualizadoEm: string
  _count?: { atividades: number }
}

export interface BibExercicioLista extends Omit<BibExercicio, 'opcoes' | 'resposta' | 'explicacao'> {}

export interface FiltrosBiblioteca {
  disciplina?: Disciplina
  topico?: string
  nivel?: string
  dificuldade?: Dificuldade
  tipo?: TipoExercicio
  status?: StatusBib
  origem?: OrigemBib
  busca?: string
  page?: number
  pageSize?: number
}

export interface PaginatedBiblioteca {
  items: BibExercicioLista[]
  total: number
  page: number
  pageSize: number
  totalPaginas: number
}

export interface CriarExercicioPayload {
  disciplina: Disciplina
  topico: string
  subtopico?: string
  nivel: string
  dificuldade: Dificuldade
  tipo: TipoExercicio
  enunciado: string
  opcoes?: string[] | null
  resposta: string
  explicacao: string
  tags?: string[]
  status?: StatusBib
}

export interface GerarIAPayload {
  disciplina: Disciplina
  topico: string
  subtopico?: string
  nivel: string
  dificuldade: Dificuldade
  tipo: TipoExercicio
  quantidade: number
}

export interface ExercicioGerado extends Omit<CriarExercicioPayload, 'status'> {}

export interface MetricasBiblioteca {
  total: number
  porStatus: { status: string; _count: number }[]
  porDisciplina: { disciplina: string; _count: number }[]
}

// ─── Trilhas ───────────────────────────────────────────────────────────────────

export interface TrilhaPedagogica {
  id: string
  nome: string
  disciplina: Disciplina
  descricao?: string
  nivelInicio: string
  nivelFim: string
  status: StatusBib
  criadoEm: string
  _count?: { itens: number }
}

export interface TrilhaDetalhe extends TrilhaPedagogica {
  itens: {
    id: string
    ordemIndex: number
    exercicio: BibExercicioLista
  }[]
}

// ─── Listas ────────────────────────────────────────────────────────────────────

export interface ListaExercicio {
  id: string
  titulo: string
  disciplina?: Disciplina
  descricao?: string
  destinatario: Destinatario
  destinoId?: string
  status: StatusBib
  criadoEm: string
  _count?: { itens: number }
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const bibliotecaService = {
  listar: (filtros: FiltrosBiblioteca = {}) =>
    api.get<{ success: boolean; data: PaginatedBiblioteca }>('/biblioteca', { params: filtros }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: BibExercicio }>(`/biblioteca/${id}`),

  metricas: () =>
    api.get<{ success: boolean; data: MetricasBiblioteca }>('/biblioteca/metricas'),

  criar: (data: CriarExercicioPayload) =>
    api.post<{ success: boolean; data: BibExercicio }>('/biblioteca', data),

  atualizar: (id: string, data: Partial<CriarExercicioPayload>) =>
    api.put<{ success: boolean; data: BibExercicio }>(`/biblioteca/${id}`, data),

  revisar: (id: string, acao: 'publicar' | 'arquivar') =>
    api.post<{ success: boolean; data: BibExercicio }>(`/biblioteca/${id}/revisar`, { acao }),

  duplicar: (id: string) =>
    api.post<{ success: boolean; data: BibExercicio }>(`/biblioteca/${id}/duplicar`),

  arquivar: (id: string) =>
    api.post<{ success: boolean; data: BibExercicio }>(`/biblioteca/${id}/revisar`, { acao: 'arquivar' }),

  excluir: (id: string) =>
    api.delete<{ success: boolean }>(`/biblioteca/${id}`),

  gerarIA: (data: GerarIAPayload) =>
    api.post<{ success: boolean; data: ExercicioGerado[] }>('/biblioteca/ia/gerar', data),

  salvarGerados: (exercicios: ExercicioGerado[]) =>
    api.post<{ success: boolean; data: BibExercicio[] }>('/biblioteca/ia/salvar', {
      exercicios: exercicios.map((ex) => ({ ...ex, origem: 'ia' })),
    }),
}

export const trilhasService = {
  listar: (filtros: { disciplina?: Disciplina; status?: StatusBib; busca?: string; page?: number } = {}) =>
    api.get<{ success: boolean; data: { items: TrilhaPedagogica[]; total: number; totalPaginas: number } }>('/trilhas', { params: filtros }),

  buscarPorId: (id: string) =>
    api.get<{ success: boolean; data: TrilhaDetalhe }>(`/trilhas/${id}`),

  criar: (data: { nome: string; disciplina: Disciplina; descricao?: string; nivelInicio: string; nivelFim: string }) =>
    api.post<{ success: boolean; data: TrilhaPedagogica }>('/trilhas', data),

  atualizar: (id: string, data: Partial<{ nome: string; disciplina: Disciplina; descricao?: string; nivelInicio: string; nivelFim: string; status: StatusBib }>) =>
    api.put<{ success: boolean; data: TrilhaPedagogica }>(`/trilhas/${id}`, data),

  excluir: (id: string) =>
    api.delete(`/trilhas/${id}`),

  adicionarItem: (trilhaId: string, exercicioId: string, ordemIndex: number) =>
    api.post(`/trilhas/${trilhaId}/itens`, { exercicioId, ordemIndex }),

  removerItem: (trilhaId: string, exercicioId: string) =>
    api.delete(`/trilhas/${trilhaId}/itens/${exercicioId}`),

  reordenar: (trilhaId: string, itens: { id: string; ordemIndex: number }[]) =>
    api.put(`/trilhas/${trilhaId}/itens/reordenar`, { itens }),
}

export const listasService = {
  listar: (filtros: { disciplina?: Disciplina; status?: StatusBib; busca?: string; page?: number } = {}) =>
    api.get<{ success: boolean; data: { items: ListaExercicio[]; total: number; totalPaginas: number } }>('/listas-exercicios', { params: filtros }),

  buscarPorId: (id: string) =>
    api.get(`/listas-exercicios/${id}`),

  criar: (data: { titulo: string; disciplina?: Disciplina; descricao?: string; destinatario?: Destinatario; destinoId?: string }) =>
    api.post<{ success: boolean; data: ListaExercicio }>('/listas-exercicios', data),

  atualizar: (id: string, data: any) =>
    api.put(`/listas-exercicios/${id}`, data),

  publicar: (id: string) =>
    api.post(`/listas-exercicios/${id}/publicar`),

  excluir: (id: string) =>
    api.delete(`/listas-exercicios/${id}`),

  adicionarItem: (listaId: string, exercicioId: string, ordemIndex: number) =>
    api.post(`/listas-exercicios/${listaId}/itens`, { exercicioId, ordemIndex }),

  removerItem: (listaId: string, exercicioId: string) =>
    api.delete(`/listas-exercicios/${listaId}/itens/${exercicioId}`),

  importarTrilha: (listaId: string, trilhaId: string) =>
    api.post(`/listas-exercicios/${listaId}/importar-trilha`, { trilhaId }),
}
