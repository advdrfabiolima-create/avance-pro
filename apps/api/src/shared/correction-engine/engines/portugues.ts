/**
 * Motor de correção para Língua Portuguesa.
 *
 * Estratégia de julgamento (em ordem de prioridade):
 * 1. Vazio → revisar
 * 2. Igualdade exata → correta
 * 3. Igualdade normalizada (espaços/case) → correta
 * 4. Diferença só por acentuação → incorreta_por_acentuacao
 * 5. Diferença só por pontuação → incorreta_por_pontuacao
 * 6. Diferença só por maiúscula → incorreta_por_maiuscula
 * 7. Diferença parece ortográfica (textos próximos) → incorreta_por_ortografia
 * 8. Diferença por acentuação + pontuação juntos → incorreta_por_acentuacao (primário)
 * 9. Muito diferente → revisar
 */

import type { CriteriosCorrecao, SaidaMotor } from '../types'
import {
  normalizarBase,
  igualNormalizado,
  difereSomentePorAcentuacao,
  difereSomentePorPontuacao,
  difereSomentePorPontuacaoFinal,
  difereSomentePorMaiuscula,
  iniciaComMinuscula,
  parecerErroOrtografico,
  normalizarSemAcentos,
  normalizarSemPontuacao,
  removerAcentos,
} from '../normalizer'
import { simboloPara } from '../symbols'

export function analisarPortugues(
  gabarito: string,
  resposta: string,
  criterios: CriteriosCorrecao
): SaidaMotor {
  const motivos: string[] = []
  const gabN = normalizarBase(gabarito)
  const resN = normalizarBase(resposta)

  // 1. Resposta vazia
  if (!resposta.trim()) {
    return resultado('revisar', 'Resposta em branco', gabN, resN, 'vazio')
  }

  // 2. Igualdade exata
  if (gabarito.trim() === resposta.trim()) {
    return resultado('correta', '', gabN, resN, 'exata')
  }

  // 3. Igualdade normalizada (espaços extras + case)
  if (igualNormalizado(gabarito, resposta)) {
    // Se só difere em maiúscula e isso é exigido, marcar
    if (criterios.exigirMaiusculaInicial && iniciaComMinuscula(resposta)) {
      return resultado('incorreta_por_maiuscula',
        'Letra inicial minúscula — frase deve começar com maiúscula',
        gabN, resN, 'maiuscula_inicial')
    }
    return resultado('correta', '', gabN, resN, 'normalizada')
  }

  // 3b. Se acentuação não é exigida e o único erro é acento → correta
  if (!criterios.exigirAcentuacao && difereSomentePorAcentuacao(gabarito, resposta)) {
    return resultado('correta', '', gabN, resN, 'acentuacao_nao_exigida')
  }

  // 4. Diferença SOMENTE por maiúscula
  if (difereSomentePorMaiuscula(gabarito, resposta)) {
    if (!criterios.exigirMaiusculaInicial) {
      return resultado('correta', '', gabN, resN, 'maiuscula_ignorada')
    }
    const motivo = iniciaComMinuscula(resposta)
      ? 'Letra inicial minúscula — frase deve começar com maiúscula'
      : 'Uso incorreto de maiúscula/minúscula'
    return resultado('incorreta_por_maiuscula', motivo, gabN, resN, 'maiuscula')
  }

  // 5. Diferença SOMENTE por acentuação
  if (criterios.exigirAcentuacao && difereSomentePorAcentuacao(gabarito, resposta)) {
    const motivo = detectarMotivoAcentuacao(gabarito, resposta)
    return resultado('incorreta_por_acentuacao', motivo, gabN, resN, 'acentuacao')
  }

  // 6a. Diferença SOMENTE por pontuação final
  if (criterios.exigirPontuacao && difereSomentePorPontuacaoFinal(gabarito, resposta)) {
    if (criterios.tolerarPontuacaoFinalAusente) {
      return resultado('correta', '', gabN, resN, 'pontuacao_final_tolerada')
    }
    return resultado('incorreta_por_pontuacao',
      'Ausência ou incorreção do ponto final',
      gabN, resN, 'pontuacao_final')
  }

  // 6b. Diferença SOMENTE por pontuação (interna)
  if (criterios.exigirPontuacao && difereSomentePorPontuacao(gabarito, resposta)) {
    return resultado('incorreta_por_pontuacao',
      'Pontuação incorreta ou ausente',
      gabN, resN, 'pontuacao')
  }

  // 7. Diferença por acentuação + pontuação juntos
  if (criterios.exigirAcentuacao && criterios.exigirPontuacao) {
    const gSemAcPt = removerAcentos(normalizarSemPontuacao(gabarito))
    const rSemAcPt = removerAcentos(normalizarSemPontuacao(resposta))
    if (gSemAcPt === rSemAcPt) {
      // Correto no conteúdo, erros formais apenas
      const haAcento = normalizarSemAcentos(gabarito) !== normalizarSemAcentos(resposta)
      const haPontuacao = normalizarSemPontuacao(gabarito) !== normalizarSemPontuacao(resposta)
      if (haAcento) motivos.push(detectarMotivoAcentuacao(gabarito, resposta))
      if (haPontuacao) motivos.push('Pontuação incorreta ou ausente')
      // Status primário: acentuação (mais grave pedagogicamente no Kumon)
      return resultadoMultiplo('incorreta_por_acentuacao', motivos, gabN, resN, 'acentuacao+pontuacao')
    }
  }

  // 8. Parece erro ortográfico (textos próximos mas com grafia diferente)
  if (criterios.exigirOrtografiaPerfeita && parecerErroOrtografico(gabarito, resposta)) {
    const motivo = detectarMotivoOrtografico(gabarito, resposta)
    return resultado('incorreta_por_ortografia', motivo, gabN, resN, 'ortografia')
  }

  // 9. Muito diferente ou não classificável com segurança → revisar
  return resultado('revisar',
    'Resposta muito diferente do gabarito ou não classificável automaticamente — revisar manualmente',
    gabN, resN, 'nao_classificavel')
}

// ─── Helpers de detecção de motivo ───────────────────────────────────────────

function detectarMotivoAcentuacao(gabarito: string, resposta: string): string {
  const palavrasGab = gabarito.split(/\s+/)
  const palavrasResp = resposta.split(/\s+/)

  // Encontra a primeira palavra diferente para dar motivo específico
  for (let i = 0; i < palavrasGab.length; i++) {
    const pg = palavrasGab[i] ?? ''
    const pr = palavrasResp[i] ?? ''
    if (pg.normalize('NFC') !== pr.normalize('NFC')) {
      const pgSem = removerAcentos(pg.toLowerCase())
      const prSem = removerAcentos(pr.toLowerCase())
      if (pgSem === prSem) {
        // Detecta tipo de acento
        if (pg === 'à' || pg === 'às') return `Ausência de crase em "${pg}" — use crase antes de palavras femininas com "a"`
        if (pg.includes('ç') && !pr.includes('ç')) return `Cedilha ausente em "${pr}" — correto: "${pg}"`
        return `Acento incorreto ou ausente em "${pr}" — correto: "${pg}"`
      }
    }
  }
  return 'Ausência ou uso incorreto de acento/crase'
}

function detectarMotivoOrtografico(gabarito: string, resposta: string): string {
  const palavrasGab = gabarito.toLowerCase().split(/\s+/)
  const palavrasResp = resposta.toLowerCase().split(/\s+/)

  for (let i = 0; i < palavrasGab.length; i++) {
    const pg = removerAcentos(palavrasGab[i] ?? '')
    const pr = removerAcentos(palavrasResp[i] ?? '')
    if (pg !== pr && pr) {
      return `Erro ortográfico em "${palavrasResp[i]}" — correto: "${palavrasGab[i]}"`
    }
  }
  return 'Erro ortográfico — grafia incorreta'
}

// ─── Builders de retorno ──────────────────────────────────────────────────────

function resultado(
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
    debug: {
      textoOriginal: resN,
      textoNormalizado: resN,
      gabaritoOriginal: gabN,
      gabaritoNormalizado: gabN,
      regraAplicada: regra,
      motivos,
    },
  }
}

function resultadoMultiplo(
  status: SaidaMotor['status'],
  motivos: string[],
  gabN: string,
  resN: string,
  regra: string
): SaidaMotor {
  return {
    status,
    motivos,
    simboloSugerido: simboloPara(status),
    revisaoNecessaria: status === 'revisar',
    scoreParcial: status === 'correta' ? 1.0 : 0.0,
    debug: {
      textoOriginal: resN,
      textoNormalizado: resN,
      gabaritoOriginal: gabN,
      gabaritoNormalizado: gabN,
      regraAplicada: regra,
      motivos,
    },
  }
}
