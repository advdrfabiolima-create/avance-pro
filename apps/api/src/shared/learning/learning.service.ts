/**
 * Detecta padrões nos feedbacks e gera/atualiza regras de ajuste.
 *
 * Lógica:
 * 1. Busca feedbacks não processados onde professor discordou da IA (ajustado=true)
 * 2. Para cada feedback, gera a chave normalizada (gabarito + resposta)
 * 3. Upsert na tabela correcoes_ajustes com upsert atômico PostgreSQL
 * 4. Confiança = min(1.0, ocorrencias / 20) → aplica automaticamente a partir de 10 ocorrências (0.5)
 * 5. Invalida cache do adjustment.engine
 *
 * Chamado de forma não-bloqueante após cada confirmação de correção.
 */

import crypto from 'crypto'
import { prisma } from '@kumon-advance/db'
import { normalizarParaChave, invalidarCache } from './adjustment.engine'

// Confiança: 10 ocorrências = 0.5 (threshold de aplicação automática)
//            20 ocorrências = 1.0 (confiança máxima)
function calcularConfianca(ocorrencias: number): number {
  return Math.min(1.0, ocorrencias / 20)
}

export async function processarFeedbacksPendentes(): Promise<void> {
  let feedbacks: Array<{
    id: string
    disciplina: string
    gabarito: string
    resposta_aluno: string
    status_ia: string
    status_final: string
  }>

  try {
    feedbacks = await prisma.$queryRaw`
      SELECT id, disciplina, gabarito, resposta_aluno, status_ia, status_final
      FROM correcoes_feedback
      WHERE processado = false AND ajustado = true
      ORDER BY criado_em ASC
      LIMIT 100
    `
  } catch {
    return  // tabela pode não existir ainda
  }

  if (!feedbacks || feedbacks.length === 0) return

  let processados = 0

  for (const fb of feedbacks) {
    try {
      const normalizado = `${normalizarParaChave(fb.gabarito)}|||${normalizarParaChave(fb.resposta_aluno)}`
      const chave = crypto.createHash('sha256').update(normalizado).digest('hex').slice(0, 64)

      const gabExemplo = fb.gabarito.slice(0, 300)
      const respExemplo = fb.resposta_aluno.slice(0, 300)

      // Upsert atômico: cria ou incrementa ocorrências e recalcula confiança
      await prisma.$executeRaw`
        INSERT INTO correcoes_ajustes
          (id, disciplina, tipo_erro, status_corrigido, padrao_chave,
           gabarito_exemplo, resposta_exemplo,
           ocorrencias, confianca, ativo, criado_em, atualizado_em)
        VALUES
          (gen_random_uuid(), ${fb.disciplina}, ${fb.status_ia}, ${fb.status_final}, ${chave},
           ${gabExemplo}, ${respExemplo},
           1, ${calcularConfianca(1)}, true, NOW(), NOW())
        ON CONFLICT (disciplina, tipo_erro, status_corrigido, padrao_chave)
        DO UPDATE SET
          ocorrencias  = correcoes_ajustes.ocorrencias + 1,
          confianca    = LEAST(1.0, (correcoes_ajustes.ocorrencias + 1)::float / 20.0),
          atualizado_em = NOW()
      `

      // Marca feedback como processado
      await prisma.$executeRaw`
        UPDATE correcoes_feedback SET processado = true WHERE id = ${fb.id}
      `

      processados++
    } catch (err: any) {
      console.error('[learning] Erro ao processar feedback:', err?.message)
    }
  }

  if (processados > 0) {
    console.log(`[learning] ${processados} feedback(s) processado(s). Cache invalidado.`)
    invalidarCache()
  }
}

// ─── Estatísticas (para futura tela de visibilidade) ─────────────────────────

export async function obterEstatisticas(): Promise<{
  totalFeedbacks: number
  totalAjustes: number
  ajustesAtivos: number
  ajustesAltaConfianca: number
}> {
  try {
    const [feedbackCount, ajusteRows] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM correcoes_feedback
      `,
      prisma.$queryRaw<Array<{ ativo: boolean; confianca: number }>>`
        SELECT ativo, confianca FROM correcoes_ajustes
      `,
    ])

    const total = Number(feedbackCount[0]?.count ?? 0)
    const ajustes = ajusteRows as Array<{ ativo: boolean; confianca: number }>

    return {
      totalFeedbacks: total,
      totalAjustes: ajustes.length,
      ajustesAtivos: ajustes.filter(a => a.ativo).length,
      ajustesAltaConfianca: ajustes.filter(a => a.ativo && Number(a.confianca) >= 0.75).length,
    }
  } catch {
    return { totalFeedbacks: 0, totalAjustes: 0, ajustesAtivos: 0, ajustesAltaConfianca: 0 }
  }
}
