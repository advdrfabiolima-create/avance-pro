import type { CriteriosCorrecao } from './types'

// ─── Defaults por disciplina ──────────────────────────────────────────────────

export const CRITERIOS_PORTUGUES: CriteriosCorrecao = {
  exigirAcentuacao: true,
  exigirPontuacao: true,
  exigirMaiusculaInicial: true,
  exigirOrtografiaPerfeita: true,
  aceitarVariacaoSemantica: false,
  aceitarEquivalenciaMatematica: false,
  tolerarEspacosExtras: true,
  tolerarPontuacaoFinalAusente: false,
  modoCorrecao: 'rigoroso',
}

export const CRITERIOS_MATEMATICA: CriteriosCorrecao = {
  exigirAcentuacao: false,
  exigirPontuacao: false,
  exigirMaiusculaInicial: false,
  exigirOrtografiaPerfeita: false,
  aceitarVariacaoSemantica: false,
  aceitarEquivalenciaMatematica: true,
  tolerarEspacosExtras: true,
  tolerarPontuacaoFinalAusente: true,
  modoCorrecao: 'moderado',
}

export const CRITERIOS_INGLES: CriteriosCorrecao = {
  exigirAcentuacao: false,  // Inglês raramente exige acentos no contexto Kumon
  exigirPontuacao: true,
  exigirMaiusculaInicial: true,
  exigirOrtografiaPerfeita: true,
  aceitarVariacaoSemantica: false,
  aceitarEquivalenciaMatematica: false,
  tolerarEspacosExtras: true,
  tolerarPontuacaoFinalAusente: false,
  modoCorrecao: 'moderado',
}

export const CRITERIOS_PADRAO: CriteriosCorrecao = {
  exigirAcentuacao: false,
  exigirPontuacao: false,
  exigirMaiusculaInicial: false,
  exigirOrtografiaPerfeita: true,
  aceitarVariacaoSemantica: false,
  aceitarEquivalenciaMatematica: false,
  tolerarEspacosExtras: true,
  tolerarPontuacaoFinalAusente: true,
  modoCorrecao: 'moderado',
}

/**
 * Retorna os critérios base para uma disciplina, mesclados com
 * qualquer override fornecido pelo chamador.
 */
export function resolverCriterios(
  disciplina: string,
  overrides?: Partial<CriteriosCorrecao>
): CriteriosCorrecao {
  const d = disciplina.toLowerCase()

  let base: CriteriosCorrecao
  if (d.includes('portugu') || d.includes('lingua') || d.includes('leitura')) {
    base = CRITERIOS_PORTUGUES
  } else if (d.includes('matem') || d.includes('math') || d.includes('calculo')) {
    base = CRITERIOS_MATEMATICA
  } else if (d.includes('ingl') || d.includes('engl')) {
    base = CRITERIOS_INGLES
  } else {
    base = CRITERIOS_PADRAO
  }

  if (!overrides) return base
  return { ...base, ...overrides }
}
