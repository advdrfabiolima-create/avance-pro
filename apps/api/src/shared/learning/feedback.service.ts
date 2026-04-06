/**
 * Captura os feedbacks do professor.
 *
 * Chamado quando o professor confirma uma correção. Para cada questão,
 * registra a classificação original da IA vs a decisão final (com ou sem
 * override manual). Feedbacks com ajustado=true são os que alimentam o
 * aprendizado (professor discordou da IA).
 */

import { prisma } from '@kumon-advance/db'
import type { FeedbackInput } from './types'

export async function registrarFeedbacks(feedbacks: FeedbackInput[]): Promise<void> {
  if (feedbacks.length === 0) return

  const values = feedbacks.map(f => ({
    disciplina: f.disciplina.slice(0, 50),
    gabarito: f.gabarito.slice(0, 500),
    resposta_aluno: f.respostaAluno.slice(0, 500),
    status_ia: f.statusIa.slice(0, 50),
    status_final: f.statusFinal.slice(0, 50),
    ajustado: f.ajustado,
    motivo_ia: f.motivoIa ? f.motivoIa.slice(0, 500) : null,
  }))

  // Raw SQL para independência de prisma generate
  for (const v of values) {
    await prisma.$executeRaw`
      INSERT INTO correcoes_feedback
        (id, disciplina, gabarito, resposta_aluno, status_ia, status_final, ajustado, motivo_ia, processado, criado_em)
      VALUES
        (gen_random_uuid(), ${v.disciplina}, ${v.gabarito}, ${v.resposta_aluno},
         ${v.status_ia}, ${v.status_final}, ${v.ajustado}, ${v.motivo_ia},
         false, NOW())
    `
  }
}
