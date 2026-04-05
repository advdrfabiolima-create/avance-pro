/**
 * Motor de correção para Matemática.
 *
 * Estratégia:
 * 1. Vazio → revisar
 * 2. Igualdade exata (normalizada) → correta
 * 3. Se aceitar_equivalencia_matematica:
 *    3a. Tentar comparação numérica (vírgula→ponto, frações)
 *    3b. Números equivalentes → correta
 *    3c. Números diferentes → incorreta_por_regra
 * 4. Não conseguiu parsear → revisar
 */

import type { CriteriosCorrecao, SaidaMotor } from '../types'
import { normalizarBase } from '../normalizer'
import { simboloPara } from '../symbols'

// ─── Parse de formatos numéricos ─────────────────────────────────────────────

/**
 * Tenta extrair um número de texto no formato Kumon:
 * - Inteiro: "7", "-3"
 * - Decimal com ponto ou vírgula: "7.5", "7,5"
 * - Fração simples: "1/2", "3/4"
 * - Porcentagem: "50%" → 0.5 (mas marca como revisar se gabarito não for %)
 *
 * Retorna null se não conseguir parsear.
 */
export function parseNumero(texto: string): number | null {
  if (!texto) return null
  const t = normalizarBase(texto).replace(',', '.')

  // Inteiro ou decimal simples
  const numerico = parseFloat(t)
  if (!isNaN(numerico) && /^-?\d+(\.\d+)?$/.test(t.trim())) {
    return numerico
  }

  // Fração: 1/2, 3/4, -1/3
  const fracaoMatch = t.match(/^(-?\d+)\s*\/\s*(\d+)$/)
  if (fracaoMatch) {
    const num = parseInt(fracaoMatch[1]!)
    const den = parseInt(fracaoMatch[2]!)
    if (den !== 0) return num / den
  }

  // Percentagem: 50%
  const pctMatch = t.match(/^(-?\d+(\.\d+)?)\s*%$/)
  if (pctMatch) return parseFloat(pctMatch[1]!) / 100

  return null
}

/** Compara dois números com tolerância de ponto flutuante. */
export function numerosEquivalentes(a: number, b: number, tolerancia = 1e-9): boolean {
  return Math.abs(a - b) <= tolerancia
}

// ─── Motor de Matemática ──────────────────────────────────────────────────────

export function analisarMatematica(
  gabarito: string,
  resposta: string,
  criterios: CriteriosCorrecao
): SaidaMotor {
  const gabN = normalizarBase(gabarito)
  const resN = normalizarBase(resposta)

  // 1. Resposta vazia
  if (!resposta.trim()) {
    return mk('revisar', 'Resposta em branco', gabN, resN, 'vazio')
  }

  // 2. Igualdade exata (normalizada)
  if (gabN === resN) {
    return mk('correta', '', gabN, resN, 'exata')
  }

  // 3. Sem equivalência matemática: comparação literal
  if (!criterios.aceitarEquivalenciaMatematica) {
    return mk('incorreta_por_regra',
      `Resposta "${resposta.trim()}" diferente do gabarito "${gabarito.trim()}"`,
      gabN, resN, 'literal_diferente')
  }

  // 4. Tentar comparação numérica
  const numGab = parseNumero(gabarito)
  const numResp = parseNumero(resposta)

  // 4a. Ambos parseáveis → comparação numérica
  if (numGab !== null && numResp !== null) {
    if (numerosEquivalentes(numGab, numResp)) {
      return mk('correta', '', gabN, resN, 'equivalencia_numerica')
    }
    return mk('incorreta_por_regra',
      `Resultado incorreto: aluno respondeu ${resposta.trim()}, esperado ${gabarito.trim()}`,
      gabN, resN, 'resultado_incorreto')
  }

  // 4b. Gabarito não é número simples (expressão, vetor, etc.) → revisar
  if (numGab === null) {
    return mk('revisar',
      'Gabarito não é um número simples — revisar manualmente',
      gabN, resN, 'gabarito_nao_numerico')
  }

  // 4c. Resposta não parseável como número
  return mk('revisar',
    `Resposta "${resposta.trim()}" não reconhecida como número — revisar manualmente`,
    gabN, resN, 'resposta_nao_numerica')
}

// ─── Builder ──────────────────────────────────────────────────────────────────

function mk(
  status: SaidaMotor['status'],
  motivo: string,
  gabN: string,
  resN: string,
  regra: string
): SaidaMotor {
  const motivos = motivo ? [motivo] : []
  return {
    status,
    motivos,
    simboloSugerido: simboloPara(status),
    revisaoNecessaria: status === 'revisar',
    scoreParcial: status === 'correta' ? 1.0 : 0.0,
    debug: { textoOriginal: resN, textoNormalizado: resN, gabaritoOriginal: gabN, gabaritoNormalizado: gabN, regraAplicada: regra, motivos },
  }
}
