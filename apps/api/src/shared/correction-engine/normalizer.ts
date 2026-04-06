/**
 * Utilitários de normalização de texto para comparação pedagógica.
 * IMPORTANTE: nunca perder a versão original — normalizar apenas para comparação.
 */

// ─── Remoção de diacríticos (acentos, cedilha, til) ─────────────────────────

/**
 * Remove todos os diacríticos: é→e, ã→a, ç→c, à→a, etc.
 * Preserva o texto em caixa original.
 */
export function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ─── Normalização de espaços ─────────────────────────────────────────────────

/** Colapsa múltiplos espaços em um e remove espaços nas bordas. */
export function normalizarEspacos(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ')
}

// ─── Normalização completa (para comparação geral) ───────────────────────────

/**
 * Normalização base:
 * - trim + colapso de espaços
 * - lowercase
 * Preserva acentos e pontuação.
 */
export function normalizarBase(texto: string): string {
  // NFC normaliza forma Unicode (evita falsos positivos quando OCR retorna NFD
  // para um acento que no banco está em NFC — ex: "caf\u0301" vs "caf\u00e9")
  return normalizarEspacos(texto).normalize('NFC').toLowerCase()
}

/**
 * Normalização sem acentos (para detectar diferença por acentuação).
 * Remove diacríticos após normalização base.
 */
export function normalizarSemAcentos(texto: string): string {
  return removerAcentos(normalizarBase(texto))
}

/**
 * Normalização sem pontuação final (.!?).
 * Mantém pontuação interna (vírgulas, etc.).
 */
export function normalizarSemPontuacaoFinal(texto: string): string {
  return normalizarBase(texto).replace(/[.!?]+$/, '')
}

/**
 * Normalização sem qualquer pontuação.
 * Remove . , ; : ! ? ( ) " ' — –
 */
export function normalizarSemPontuacao(texto: string): string {
  return normalizarBase(texto).replace(/[.,;:!?()"""''—–\-]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Normalização sem acentos e sem pontuação.
 * Usado para detectar quando o único erro é combinado acento+pontuação.
 */
export function normalizarSemAcentosSemPontuacao(texto: string): string {
  return removerAcentos(normalizarSemPontuacao(texto))
}

// ─── Comparadores focados ────────────────────────────────────────────────────

/** Verifica se os textos são idênticos após normalização base (trim + lowercase). */
export function igualNormalizado(a: string, b: string): boolean {
  return normalizarBase(a) === normalizarBase(b)
}

/** Verifica se diferem APENAS em acentuação (diacríticos). */
export function difereSomentePorAcentuacao(gabarito: string, resposta: string): boolean {
  if (igualNormalizado(gabarito, resposta)) return false
  return normalizarSemAcentos(gabarito) === normalizarSemAcentos(resposta)
}

/** Verifica se diferem APENAS na pontuação final. */
export function difereSomentePorPontuacaoFinal(gabarito: string, resposta: string): boolean {
  if (igualNormalizado(gabarito, resposta)) return false
  return normalizarSemPontuacaoFinal(gabarito) === normalizarSemPontuacaoFinal(resposta)
}

/** Verifica se diferem APENAS em pontuação (interna + final). */
export function difereSomentePorPontuacao(gabarito: string, resposta: string): boolean {
  if (igualNormalizado(gabarito, resposta)) return false
  return normalizarSemPontuacao(gabarito) === normalizarSemPontuacao(resposta)
}

/** Verifica se diferem APENAS em caixa (maiúscula/minúscula). */
export function difereSomentePorMaiuscula(gabarito: string, resposta: string): boolean {
  // Usa normalizarEspacos (sem lowercase) para preservar caixa
  const a = normalizarEspacos(gabarito)
  const b = normalizarEspacos(resposta)
  if (a === b) return false  // Idênticos — sem diferença
  // Iguais quando ignoramos caixa → diferem SOMENTE por caixa
  return a.toLowerCase() === b.toLowerCase()
}

/** Verifica se o início da resposta está com minúscula quando deveria ser maiúscula. */
export function iniciaComMinuscula(texto: string): boolean {
  const t = normalizarEspacos(texto)
  if (!t) return false
  return t[0] === t[0].toLowerCase() && t[0] !== t[0].toUpperCase()
}

// ─── Levenshtein (distância de edição) ───────────────────────────────────────

/** Calcula distância de edição entre dois textos. */
export function distanciaLevenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  // Otimização: usa apenas duas linhas
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr: number[] = [i]
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]!
        : 1 + Math.min(prev[j]!, curr[j - 1]!, prev[j - 1]!)
    }
    prev = curr
  }
  return prev[n]!
}

/**
 * Razão de similaridade entre dois textos (0.0 = totalmente diferentes, 1.0 = iguais).
 * Normaliza pela maior string.
 */
export function similaridade(a: string, b: string): number {
  if (a === b) return 1.0
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0
  return 1 - distanciaLevenshtein(a, b) / maxLen
}

/**
 * Verifica se a diferença parece ser ortográfica:
 * - textos similares mas não iguais (similaridade entre 0.6 e 0.99)
 * - calculado sobre versões sem acentos
 */
export function parecerErroOrtografico(gabarito: string, resposta: string): boolean {
  const g = normalizarSemAcentosSemPontuacao(gabarito)
  const r = normalizarSemAcentosSemPontuacao(resposta)
  if (g === r) return false
  const sim = similaridade(g, r)
  return sim >= 0.55 && sim < 1.0
}
