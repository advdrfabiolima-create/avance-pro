/**
 * Motor de correção para Língua Portuguesa.
 *
 * Estratégia de julgamento (em ordem de prioridade):
 * 1. Vazio → revisar
 * 2. Igualdade exata → correta
 * 3. Igualdade normalizada (espaços/case) → correta
 * 4. Lista de palavras → avaliação palavra a palavra (detecta TODOS os erros)
 * 5. Diferença só por acentuação → incorreta_por_acentuacao
 * 6. Diferença só por pontuação → incorreta_por_pontuacao
 * 7. Diferença só por maiúscula → incorreta_por_maiuscula
 * 8. Diferença parece ortográfica (textos próximos) → incorreta_por_ortografia
 * 9. Diferença por acentuação + pontuação juntos → incorreta_por_acentuacao (primário)
 * 10. Muito diferente → revisar
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

// ─── Detecção e análise de lista de palavras ──────────────────────────────────

/**
 * Tenta separar um texto por separadores de lista (travessão, barra, vírgula, ponto-e-vírgula).
 * Retorna array com 1 elemento se não encontrar separadores.
 */
function separarListaPalavras(texto: string): string[] {
  // Prioridade: travessão/barra (mais comum em Kumon) → vírgula → ponto-e-vírgula
  for (const sep of [/\s*[–—\/]\s*/, /\s*,\s+(?=[A-Za-zÀ-ÖØ-öø-ÿ0-9])/, /\s*;\s*/]) {
    const partes = texto.split(sep).map((s) => s.trim()).filter(Boolean)
    if (partes.length >= 2) return partes
  }
  return [texto.trim()].filter(Boolean)
}

/** Retorna true se o gabarito parecer uma lista de palavras/expressões curtas. */
function ehListaPalavras(gabarito: string): boolean {
  const partes = separarListaPalavras(gabarito)
  // 2+ itens, nenhum item com pontuação terminal (ponto, ?, !) = lista de palavras
  return partes.length >= 2 && !gabarito.match(/[.?!]/)
}

/**
 * Prioridade de gravidade para combinar status de múltiplas palavras.
 * Quanto menor o número, mais grave.
 */
function gravidadeStatus(status: SaidaMotor['status']): number {
  const ordem: Record<string, number> = {
    revisar: 0,
    incorreta_por_ortografia: 1,
    incorreta_por_regra: 2,
    incorreta_por_acentuacao: 3,
    incorreta_por_pontuacao: 4,
    incorreta_por_maiuscula: 5,
    correta: 99,
  }
  return ordem[status] ?? 0
}

/**
 * Analisa questão discursiva cujo gabarito é uma lista de palavras.
 * Compara cada palavra individualmente e coleta TODOS os erros encontrados.
 */
function analisarListaPalavras(
  gabarito: string,
  resposta: string,
  criterios: CriteriosCorrecao
): SaidaMotor {
  const gabPartes = separarListaPalavras(gabarito)
  const resPartes = separarListaPalavras(resposta)

  const todosMotivos: string[] = []
  let piorStatus: SaidaMotor['status'] = 'correta'

  for (let i = 0; i < gabPartes.length; i++) {
    const gab = gabPartes[i] ?? ''
    const res = resPartes[i] ?? ''

    if (!res.trim()) {
      todosMotivos.push(`"${gab}": não respondida`)
      if (gravidadeStatus(piorStatus) > gravidadeStatus('revisar')) {
        piorStatus = 'revisar'
      }
      continue
    }

    // Avalia palavra por palavra com o motor completo (sem recursão de lista)
    const parcial = analisarPalavraSimples(gab, res, criterios)
    if (parcial.status !== 'correta') {
      const motivo = parcial.motivos.length > 0
        ? `"${res}" (correto: "${gab}"): ${parcial.motivos.join(', ')}`
        : `"${res}" incorreta (correto: "${gab}")`
      todosMotivos.push(motivo)

      if (gravidadeStatus(parcial.status) < gravidadeStatus(piorStatus)) {
        piorStatus = parcial.status
      }
    }
  }

  if (piorStatus === 'correta') {
    return resultado('correta', '', normalizarBase(gabarito), normalizarBase(resposta), 'lista_ok')
  }

  return resultadoMultiplo(
    piorStatus,
    todosMotivos,
    normalizarBase(gabarito),
    normalizarBase(resposta),
    'lista_erros'
  )
}

// ─── Motor principal ──────────────────────────────────────────────────────────

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
    if (criterios.exigirMaiusculaInicial && iniciaComMinuscula(resposta)) {
      return resultado('incorreta_por_maiuscula',
        'Letra inicial minúscula — frase deve começar com maiúscula',
        gabN, resN, 'maiuscula_inicial')
    }
    return resultado('correta', '', gabN, resN, 'normalizada')
  }

  // 4. Lista de palavras → avalia cada palavra e coleta TODOS os erros
  if (ehListaPalavras(gabarito)) {
    return analisarListaPalavras(gabarito, resposta, criterios)
  }

  // 5–10. Análise de palavra/frase simples
  return analisarPalavraSimples(gabarito, resposta, criterios)
}

/**
 * Análise de uma palavra ou frase simples (sem lista).
 * Chamado tanto diretamente pelo motor quanto recursivamente pela análise de lista.
 */
function analisarPalavraSimples(
  gabarito: string,
  resposta: string,
  criterios: CriteriosCorrecao
): SaidaMotor {
  const motivos: string[] = []
  const gabN = normalizarBase(gabarito)
  const resN = normalizarBase(resposta)

  if (!resposta.trim()) {
    return resultado('revisar', 'Resposta em branco', gabN, resN, 'vazio')
  }

  if (gabarito.trim() === resposta.trim()) {
    return resultado('correta', '', gabN, resN, 'exata')
  }

  if (igualNormalizado(gabarito, resposta)) {
    if (criterios.exigirMaiusculaInicial && iniciaComMinuscula(resposta)) {
      return resultado('incorreta_por_maiuscula',
        'Letra inicial minúscula',
        gabN, resN, 'maiuscula_inicial')
    }
    return resultado('correta', '', gabN, resN, 'normalizada')
  }

  // Se acentuação não é exigida e o único erro é acento → correta
  if (!criterios.exigirAcentuacao && difereSomentePorAcentuacao(gabarito, resposta)) {
    return resultado('correta', '', gabN, resN, 'acentuacao_nao_exigida')
  }

  // Diferença SOMENTE por maiúscula
  if (difereSomentePorMaiuscula(gabarito, resposta)) {
    if (!criterios.exigirMaiusculaInicial) {
      return resultado('correta', '', gabN, resN, 'maiuscula_ignorada')
    }
    const motivo = iniciaComMinuscula(resposta)
      ? 'Letra inicial minúscula'
      : 'Uso incorreto de maiúscula/minúscula'
    return resultado('incorreta_por_maiuscula', motivo, gabN, resN, 'maiuscula')
  }

  // Diferença SOMENTE por acentuação
  if (criterios.exigirAcentuacao && difereSomentePorAcentuacao(gabarito, resposta)) {
    const motivo = detectarMotivosAcentuacao(gabarito, resposta)
    return resultado('incorreta_por_acentuacao', motivo, gabN, resN, 'acentuacao')
  }

  // Diferença SOMENTE por pontuação final
  if (criterios.exigirPontuacao && difereSomentePorPontuacaoFinal(gabarito, resposta)) {
    if (criterios.tolerarPontuacaoFinalAusente) {
      return resultado('correta', '', gabN, resN, 'pontuacao_final_tolerada')
    }
    return resultado('incorreta_por_pontuacao',
      'Ausência ou incorreção do ponto final',
      gabN, resN, 'pontuacao_final')
  }

  // Diferença SOMENTE por pontuação (interna)
  if (criterios.exigirPontuacao && difereSomentePorPontuacao(gabarito, resposta)) {
    return resultado('incorreta_por_pontuacao',
      'Pontuação incorreta ou ausente',
      gabN, resN, 'pontuacao')
  }

  // Diferença por acentuação + pontuação juntos
  if (criterios.exigirAcentuacao && criterios.exigirPontuacao) {
    const gSemAcPt = removerAcentos(normalizarSemPontuacao(gabarito))
    const rSemAcPt = removerAcentos(normalizarSemPontuacao(resposta))
    if (gSemAcPt === rSemAcPt) {
      const haAcento = normalizarSemAcentos(gabarito) !== normalizarSemAcentos(resposta)
      const haPontuacao = normalizarSemPontuacao(gabarito) !== normalizarSemPontuacao(resposta)
      if (haAcento) motivos.push(detectarMotivosAcentuacao(gabarito, resposta))
      if (haPontuacao) motivos.push('Pontuação incorreta ou ausente')
      return resultadoMultiplo('incorreta_por_acentuacao', motivos, gabN, resN, 'acentuacao+pontuacao')
    }
  }

  // Parece erro ortográfico (textos próximos mas com grafia diferente)
  if (criterios.exigirOrtografiaPerfeita && parecerErroOrtografico(gabarito, resposta)) {
    const motivo = detectarMotivoOrtografico(gabarito, resposta)
    return resultado('incorreta_por_ortografia', motivo, gabN, resN, 'ortografia')
  }

  // Muito diferente ou não classificável → revisar
  return resultado('revisar',
    'Resposta muito diferente do gabarito — revisar manualmente',
    gabN, resN, 'nao_classificavel')
}

// ─── Helpers de detecção de motivo ───────────────────────────────────────────

/**
 * Detecta TODOS os acentos incorretos ou ausentes, comparando palavra a palavra.
 * Retorna string com todos os erros encontrados separados por " | ".
 */
function detectarMotivosAcentuacao(gabarito: string, resposta: string): string {
  const palavrasGab = gabarito.split(/\s+/)
  const palavrasResp = resposta.split(/\s+/)
  const motivos: string[] = []

  for (let i = 0; i < palavrasGab.length; i++) {
    const pg = (palavrasGab[i] ?? '').normalize('NFC')
    const pr = (palavrasResp[i] ?? '').normalize('NFC')
    if (pg === pr) continue

    const pgSem = removerAcentos(pg.toLowerCase())
    const prSem = removerAcentos(pr.toLowerCase())
    if (pgSem !== prSem) continue  // não é só acento, é outra diferença

    if (pg === 'à' || pg === 'às') {
      motivos.push(`Ausência de crase em "${pg}"`)
    } else if (pg.includes('ç') && !pr.includes('ç')) {
      motivos.push(`Cedilha ausente em "${pr}" — correto: "${pg}"`)
    } else {
      motivos.push(`Acento incorreto em "${pr}" — correto: "${pg}"`)
    }
  }

  return motivos.length > 0
    ? motivos.join(' | ')
    : 'Ausência ou uso incorreto de acento/crase'
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
