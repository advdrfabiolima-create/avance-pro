// ─── Status de correção pedagógica ───────────────────────────────────────────

export type StatusCorrecaoPedagogica =
  | 'correta'
  | 'incorreta_por_ortografia'
  | 'incorreta_por_acentuacao'
  | 'incorreta_por_pontuacao'
  | 'incorreta_por_maiuscula'
  | 'incorreta_por_regra'
  | 'revisar'

export type ModoCorrecao = 'rigoroso' | 'moderado' | 'flexivel'

// ─── Critérios configuráveis ──────────────────────────────────────────────────

export interface CriteriosCorrecao {
  /** Exige que acentos, crases e cedilhas estejam corretos */
  exigirAcentuacao: boolean
  /** Exige pontuação correta (ponto final, vírgula, etc.) */
  exigirPontuacao: boolean
  /** Exige maiúscula no início de frase */
  exigirMaiusculaInicial: boolean
  /** Exige ortografia perfeita (sem erros de grafia) */
  exigirOrtografiaPerfeita: boolean
  /** Aceita respostas semanticamente equivalentes (ex: sinônimos) */
  aceitarVariacaoSemantica: boolean
  /** Aceita formatos numéricos equivalentes (ex: 0,5 = 1/2 = 0.5) */
  aceitarEquivalenciaMatematica: boolean
  /** Ignora espaços extras */
  tolerarEspacosExtras: boolean
  /** Aceita ausência de ponto final como não-erro */
  tolerarPontuacaoFinalAusente: boolean
  /** Nível de rigor geral */
  modoCorrecao: ModoCorrecao
}

// ─── Entrada do motor ─────────────────────────────────────────────────────────

export interface EntradaMotor {
  disciplina: string
  gabarito: string
  respostaAluno: string
  /** Critérios opcionais — serão mesclados ao default da disciplina */
  criterios?: Partial<CriteriosCorrecao>
}

// ─── Saída do motor ───────────────────────────────────────────────────────────

export interface SaidaMotor {
  status: StatusCorrecaoPedagogica
  /** Motivos ordenados do mais grave ao menos grave */
  motivos: string[]
  /** Símbolo sugerido para correção na folha */
  simboloSugerido: string
  /** true = professor deve revisar manualmente */
  revisaoNecessaria: boolean
  /** 1.0 = totalmente correta, 0.0 = totalmente incorreta */
  scoreParcial: number
  debug: DebugMotor
}

export interface DebugMotor {
  textoOriginal: string
  textoNormalizado: string
  gabaritoOriginal: string
  gabaritoNormalizado: string
  regraAplicada: string
  motivos: string[]
}
