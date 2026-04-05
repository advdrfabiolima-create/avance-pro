/**
 * Motor central de análise pedagógica.
 *
 * Recebe resposta estruturada (já extraída por OCR ou digitada)
 * e devolve classificação pedagógica com símbolo, motivo e flag de revisão.
 *
 * NÃO depende de IA — é uma camada de regras determinísticas.
 */

import type { EntradaMotor, SaidaMotor } from './types'
import { resolverCriterios } from './criterios'
import { analisarPortugues } from './engines/portugues'
import { analisarMatematica } from './engines/matematica'
import { analisarIngles } from './engines/ingles'
import { simboloPara } from './symbols'
import { normalizarBase } from './normalizer'

/**
 * Função principal do motor pedagógico.
 *
 * Exemplo de uso:
 * ```ts
 * const resultado = analisarRespostaPedagogicamente({
 *   disciplina: 'portugues',
 *   gabarito: 'A menina foi à escola.',
 *   respostaAluno: 'A menina foi a escola',
 * })
 * // → { status: 'incorreta_por_acentuacao', simboloSugerido: '´', ... }
 * ```
 */
export function analisarRespostaPedagogicamente(entrada: EntradaMotor): SaidaMotor {
  const { disciplina, gabarito, respostaAluno, criterios: overrides } = entrada

  // Resolução de critérios: default da disciplina + overrides
  const criterios = resolverCriterios(disciplina, overrides)

  // Fallback de segurança: undefined/null → revisar
  if (gabarito == null || respostaAluno == null) {
    return fallbackRevisar(gabarito ?? '', respostaAluno ?? '', 'entrada_invalida')
  }

  const d = disciplina.toLowerCase()

  if (d.includes('portugu') || d.includes('lingua') || d.includes('leitura')) {
    return analisarPortugues(gabarito, respostaAluno, criterios)
  }

  if (d.includes('matem') || d.includes('math') || d.includes('calculo')) {
    return analisarMatematica(gabarito, respostaAluno, criterios)
  }

  if (d.includes('ingl') || d.includes('engl')) {
    return analisarIngles(gabarito, respostaAluno, criterios)
  }

  // Disciplina desconhecida: análise genérica conservadora
  return analisarGenerico(gabarito, respostaAluno, disciplina)
}

// ─── Motor genérico (disciplina não mapeada) ──────────────────────────────────

function analisarGenerico(gabarito: string, resposta: string, disciplina: string): SaidaMotor {
  if (!resposta.trim()) {
    return fallbackRevisar(gabarito, resposta, 'vazio')
  }

  const gabN = normalizarBase(gabarito)
  const resN = normalizarBase(resposta)

  if (gabN === resN) {
    return {
      status: 'correta',
      motivos: [],
      simboloSugerido: simboloPara('correta'),
      revisaoNecessaria: false,
      scoreParcial: 1.0,
      debug: { textoOriginal: resposta, textoNormalizado: resN, gabaritoOriginal: gabarito, gabaritoNormalizado: gabN, regraAplicada: 'generico_exata', motivos: [] },
    }
  }

  // Disciplina desconhecida com respostas diferentes → sempre revisar
  return fallbackRevisar(gabarito, resposta, `disciplina_desconhecida:${disciplina}`)
}

// ─── Fallback de revisão ──────────────────────────────────────────────────────

function fallbackRevisar(gabarito: string, resposta: string, regra: string): SaidaMotor {
  const motivo = 'Não foi possível classificar automaticamente — revisar manualmente'
  return {
    status: 'revisar',
    motivos: [motivo],
    simboloSugerido: simboloPara('revisar'),
    revisaoNecessaria: true,
    scoreParcial: 0.0,
    debug: {
      textoOriginal: resposta,
      textoNormalizado: normalizarBase(resposta),
      gabaritoOriginal: gabarito,
      gabaritoNormalizado: normalizarBase(gabarito),
      regraAplicada: regra,
      motivos: [motivo],
    },
  }
}
