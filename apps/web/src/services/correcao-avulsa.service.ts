import { api } from './api'

export type StatusCorrecaoQuestao =
  | 'correta'
  | 'incorreta_por_ortografia'
  | 'incorreta_por_acentuacao'
  | 'incorreta_por_pontuacao'
  | 'incorreta_por_regra'
  | 'revisar'

export interface GabaritoItem {
  ordem: number
  tipo: 'objetiva' | 'numerica' | 'discursiva'
  resposta: string
}

export interface ResultadoQuestao {
  questaoOrdem: number
  tipo: string
  respostaGabarito: string
  respostaAluno: string | null
  confianca: number | null
  correta: boolean
  statusCorrecao: StatusCorrecaoQuestao
  textoDetectado: string | null
  avaliacaoIA: 'correto' | 'parcial' | 'incorreto' | null
  justificativa: string | null
  revisadaManual: boolean
  decisaoManual?: boolean | null
  statusManual?: StatusCorrecaoQuestao | null
}

export interface ResultadoCorrecao {
  totalQuestoes: number
  acertos: number
  erros: number
  naoDetectadas: number
  percentual: number
  questoes: ResultadoQuestao[]
}

export interface CorrecaoAvulsaDetalhe {
  id: string
  alunoId: string
  titulo: string | null
  disciplina: string | null
  gabaritoFonte: string
  status: string
  totalQuestoes: number | null
  totalAcertos: number | null
  percentual: number | null
  criadoEm: string
  confirmadoEm: string | null
  questoes: ResultadoQuestao[]
  aluno: { id: string; nome: string; foto: string | null }
}

export const correcaoAvulsaService = {
  extrairGabarito: (arquivoBase64: string, tipoArquivo: string) =>
    api.post<{ success: boolean; data: GabaritoItem[] }>('/correcao-avulsa/extrair-gabarito', {
      arquivoBase64,
      tipoArquivo,
    }),

  processar: (arquivoBase64: string, tipoArquivo: string, gabarito: GabaritoItem[]) =>
    api.post<{ success: boolean; data: ResultadoCorrecao }>('/correcao-avulsa/processar', {
      arquivoBase64,
      tipoArquivo,
      gabarito,
    }),

  corrigir: (data: {
    alunoId: string
    titulo?: string
    disciplina?: string
    arquivoBase64: string
    tipoArquivo: string
    gabaritoFonte: 'manual' | 'foto'
    gabaritoBase64?: string
    gabaritoMime?: string
    gabarito: GabaritoItem[]
  }) =>
    api.post<{ success: boolean; data: CorrecaoAvulsaDetalhe }>('/correcao-avulsa/corrigir', data),

  atualizarQuestoes: (
    id: string,
    questoes: Array<{ ordem: number; decisaoManual: boolean; statusManual: StatusCorrecaoQuestao }>
  ) =>
    api.put<{ success: boolean; data: ResultadoQuestao[] }>(`/correcao-avulsa/${id}/questoes`, { questoes }),

  confirmar: (id: string) =>
    api.post<{ success: boolean; data: CorrecaoAvulsaDetalhe }>(`/correcao-avulsa/${id}/confirmar`, {}),

  obter: (id: string) =>
    api.get<{ success: boolean; data: CorrecaoAvulsaDetalhe }>(`/correcao-avulsa/${id}`),

  salvar: (data: {
    alunoId: string
    titulo?: string
    disciplina?: string
    arquivoBase64: string
    tipoArquivo: string
    gabaritoFonte: 'manual' | 'foto'
    gabarito: GabaritoItem[]
    resultadoJson: ResultadoCorrecao
  }) => api.post<{ success: boolean; data: { id: string } }>('/correcao-avulsa', data),

  listar: (params: { alunoId?: string; page?: number; pageSize?: number }) =>
    api.get<{ success: boolean; data: { items: any[]; total: number } }>('/correcao-avulsa', { params }),
}
