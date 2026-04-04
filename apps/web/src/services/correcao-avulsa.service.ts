import { api } from './api'

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
}

export interface ResultadoCorrecao {
  totalQuestoes: number
  acertos: number
  erros: number
  naoDetectadas: number
  percentual: number
  questoes: ResultadoQuestao[]
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
