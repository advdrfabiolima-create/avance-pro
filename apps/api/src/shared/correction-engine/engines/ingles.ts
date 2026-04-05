/**
 * Motor de correção para Inglês.
 *
 * Primeira versão simples — foco em ortografia, pontuação e maiúscula.
 * Sem análise semântica (marcar como revisar quando ambíguo).
 *
 * Estratégia:
 * 1. Vazio → revisar
 * 2. Igualdade exata → correta
 * 3. Igualdade normalizada → correta (ou maiúscula se exigido)
 * 4. Diferença só por maiúscula → incorreta_por_maiuscula (se exigido)
 * 5. Diferença só por pontuação → incorreta_por_pontuacao (se exigido)
 * 6. Textos próximos → incorreta_por_ortografia
 * 7. Muito diferente → revisar
 *
 * Nota: Inglês geralmente não usa diacríticos no contexto Kumon,
 * então a detecção de acentuação é simplificada.
 */

import type { CriteriosCorrecao, SaidaMotor } from '../types'
import {
  normalizarBase,
  igualNormalizado,
  difereSomentePorMaiuscula,
  difereSomentePorPontuacao,
  difereSomentePorPontuacaoFinal,
  iniciaComMinuscula,
  parecerErroOrtografico,
} from '../normalizer'
import { simboloPara } from '../symbols'

export function analisarIngles(
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

  // 2. Igualdade exata
  if (gabarito.trim() === resposta.trim()) {
    return mk('correta', '', gabN, resN, 'exata')
  }

  // 3. Igualdade normalizada
  if (igualNormalizado(gabarito, resposta)) {
    if (criterios.exigirMaiusculaInicial && iniciaComMinuscula(resposta)) {
      return mk('incorreta_por_maiuscula',
        'Sentence must start with a capital letter',
        gabN, resN, 'maiuscula_inicial')
    }
    return mk('correta', '', gabN, resN, 'normalizada')
  }

  // 4. Diferença só por maiúscula
  if (difereSomentePorMaiuscula(gabarito, resposta)) {
    if (!criterios.exigirMaiusculaInicial) {
      return mk('correta', '', gabN, resN, 'maiuscula_ignorada')
    }
    return mk('incorreta_por_maiuscula',
      iniciaComMinuscula(resposta)
        ? 'Sentence must start with a capital letter'
        : 'Incorrect use of capital/lowercase letter',
      gabN, resN, 'maiuscula')
  }

  // 5a. Diferença só por pontuação final
  if (criterios.exigirPontuacao && difereSomentePorPontuacaoFinal(gabarito, resposta)) {
    if (criterios.tolerarPontuacaoFinalAusente) {
      return mk('correta', '', gabN, resN, 'pontuacao_final_tolerada')
    }
    return mk('incorreta_por_pontuacao',
      'Missing or incorrect punctuation at end of sentence',
      gabN, resN, 'pontuacao_final')
  }

  // 5b. Diferença só por pontuação interna
  if (criterios.exigirPontuacao && difereSomentePorPontuacao(gabarito, resposta)) {
    return mk('incorreta_por_pontuacao',
      'Incorrect punctuation',
      gabN, resN, 'pontuacao')
  }

  // 6. Parece erro ortográfico
  if (criterios.exigirOrtografiaPerfeita && parecerErroOrtografico(gabarito, resposta)) {
    return mk('incorreta_por_ortografia',
      detectarPalavraErrada(gabarito, resposta),
      gabN, resN, 'ortografia')
  }

  // 7. Muito diferente → revisar
  return mk('revisar',
    'Answer too different from key — please review manually',
    gabN, resN, 'nao_classificavel')
}

function detectarPalavraErrada(gabarito: string, resposta: string): string {
  const pg = gabarito.toLowerCase().split(/\s+/)
  const pr = resposta.toLowerCase().split(/\s+/)
  for (let i = 0; i < pg.length; i++) {
    if ((pg[i] ?? '') !== (pr[i] ?? '') && pr[i]) {
      return `Spelling error in "${pr[i]}" — correct: "${pg[i]}"`
    }
  }
  return 'Spelling error'
}

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
