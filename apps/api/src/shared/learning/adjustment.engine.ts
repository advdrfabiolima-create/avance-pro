/**
 * Motor de ajustes aprendidos.
 *
 * Mantém um cache em memória das regras aprendidas (CorrecaoAjuste com
 * confiança ≥ 0.5, ou seja, ≥ 10 ocorrências). Recarrega automaticamente
 * a cada 5 min. Aplica o ajuste correspondente antes do resultado final
 * do motor pedagógico, sobrescrevendo o status quando há correspondência.
 */

import crypto from 'crypto'
import { prisma } from '@kumon-advance/db'
import type { AjusteAplicado, AjusteCacheEntry } from './types'

// ─── Normalização para chave de padrão ───────────────────────────────────────

export function normalizarParaChave(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacríticos
    .replace(/[^\w\s]/g, ' ')           // remove pontuação
    .replace(/\s+/g, ' ')
    .trim()
}

export function gerarChave(gabarito: string, resposta: string): string {
  const normalizado = `${normalizarParaChave(gabarito)}|||${normalizarParaChave(resposta)}`
  return crypto.createHash('sha256').update(normalizado).digest('hex').slice(0, 64)
}

// ─── Cache em memória ─────────────────────────────────────────────────────────

// Chave: "disciplina:tipoErro:padraoChave"
const _cache = new Map<string, AjusteCacheEntry>()
let _carregado = false
let _ultimaAtualizacao = 0
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutos

export function invalidarCache(): void {
  _carregado = false
}

async function carregarCache(): Promise<void> {
  const agora = Date.now()
  if (_carregado && agora - _ultimaAtualizacao < CACHE_TTL_MS) return

  try {
    // Busca via raw SQL para evitar dependência de prisma generate
    const rows = await prisma.$queryRaw<Array<{
      disciplina: string
      tipo_erro: string
      padrao_chave: string
      status_corrigido: string
      confianca: number
      ocorrencias: number
    }>>`
      SELECT disciplina, tipo_erro, padrao_chave, status_corrigido, confianca, ocorrencias
      FROM correcoes_ajustes
      WHERE ativo = true AND confianca >= 0.5
    `

    _cache.clear()
    for (const row of rows) {
      const cacheKey = `${row.disciplina}:${row.tipo_erro}:${row.padrao_chave}`
      _cache.set(cacheKey, {
        statusCorrigido: row.status_corrigido,
        confianca: Number(row.confianca),
        ocorrencias: Number(row.ocorrencias),
      })
    }

    _carregado = true
    _ultimaAtualizacao = agora
    console.log(`[learning] Cache carregado: ${_cache.size} ajuste(s) ativo(s)`)
  } catch {
    // Tabela pode não existir ainda (primeiro deploy) — falha silenciosa
    _carregado = true
    _ultimaAtualizacao = agora
  }
}

// Pré-carrega no startup
export async function inicializarCache(): Promise<void> {
  await carregarCache()
}

// ─── Aplicar ajuste ──────────────────────────────────────────────────────────

/**
 * Verifica se existe um ajuste aprendido para este padrão.
 * Retorna null se não houver ajuste com confiança suficiente.
 */
export async function aplicarAjuste(
  disciplina: string,
  gabarito: string,
  respostaAluno: string,
  statusAtual: string,
): Promise<AjusteAplicado | null> {
  try {
    await carregarCache()

    const chave = gerarChave(gabarito, respostaAluno)
    const cacheKey = `${disciplina}:${statusAtual}:${chave}`
    const entrada = _cache.get(cacheKey)

    if (!entrada) return null

    return {
      statusAjustado: entrada.statusCorrigido,
      confianca: entrada.confianca,
      ocorrencias: entrada.ocorrencias,
    }
  } catch {
    return null  // ajustes são camada opcional — nunca bloquear a correção
  }
}
