import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { prisma } from '@kumon-advance/db'
import { z } from 'zod'

const filtrosPresencaSchema = z.object({
  data: z.string().optional(),
  turmaId: z.string().uuid().optional(),
  semana: z.string().optional(), // ISO week start date (segunda-feira)
})

const marcarPresencaSchema = z.object({
  sessaoAlunoId: z.string().uuid(),
  presente: z.boolean(),
})

export async function presencaRoutes(app: FastifyInstance): Promise<void> {
  // GET /presenca?data=YYYY-MM-DD&turmaId=... — lista alunos esperados com status de presença
  app.get('/', { preHandler: autenticar }, async (request, reply) => {
    const resultado = filtrosPresencaSchema.safeParse(request.query)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Parâmetros inválidos' })
    }

    const { data, turmaId, semana } = resultado.data

    try {
      // Se veio uma data, retorna presença da sessão daquele dia
      if (data) {
        const dataRef = new Date(data)

        const where: any = {
          sessao: { data: dataRef },
        }
        if (turmaId) where.sessao.turmaId = turmaId

        const sessaoAlunos = await prisma.sessaoAluno.findMany({
          where,
          include: {
            aluno: { select: { id: true, nome: true, foto: true } },
            sessao: {
              select: {
                id: true,
                data: true,
                turmaId: true,
                turma: { select: { id: true, horarioInicio: true, horarioFim: true, diaSemana: true } },
              },
            },
            matricula: { include: { materia: { select: { nome: true, codigo: true } } } },
          },
          orderBy: { aluno: { nome: 'asc' } },
        })

        return reply.status(200).send({ success: true, data: sessaoAlunos })
      }

      // Se veio semana, retorna resumo de presença da semana (agrupado por dia)
      if (semana) {
        const inicioSemana = new Date(semana)
        const fimSemana = new Date(semana)
        fimSemana.setDate(fimSemana.getDate() + 6)

        const sessoes = await prisma.sessao.findMany({
          where: {
            data: { gte: inicioSemana, lte: fimSemana },
            ...(turmaId && { turmaId }),
          },
          include: {
            turma: true,
            alunos: {
              include: {
                aluno: { select: { id: true, nome: true, foto: true } },
              },
            },
          },
          orderBy: { data: 'asc' },
        })

        return reply.status(200).send({ success: true, data: sessoes })
      }

      // Sem filtro de data, retorna turmas do dia atual
      const hoje = new Date()
      const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
      const diaAtual = diasSemana[hoje.getDay()]

      const turmasHoje = await prisma.turma.findMany({
        where: { diaSemana: diaAtual as any },
        include: {
          alunos: {
            where: { dataFim: null },
            include: { aluno: { select: { id: true, nome: true, foto: true, ativo: true } } },
          },
        },
      })

      return reply.status(200).send({ success: true, data: turmasHoje })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar presença' })
    }
  })

  // PATCH /presenca/marcar — atualiza presença de um SessaoAluno
  app.patch('/marcar', { preHandler: autenticar }, async (request, reply) => {
    const resultado = marcarPresencaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    }

    try {
      const atualizado = await prisma.sessaoAluno.update({
        where: { id: resultado.data.sessaoAlunoId },
        data: { presente: resultado.data.presente },
        include: { aluno: { select: { id: true, nome: true } } },
      })
      return reply.status(200).send({ success: true, data: atualizado })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao marcar presença' })
    }
  })

  // GET /presenca/quadro — quadro de horários semanal com alunos por turma
  app.get('/quadro', { preHandler: autenticar }, async (request, reply) => {
    try {
      const turmas = await prisma.turma.findMany({
        include: {
          alunos: {
            where: { dataFim: null },
            include: {
              aluno: { select: { id: true, nome: true, foto: true, ativo: true } },
            },
          },
        },
        orderBy: [{ diaSemana: 'asc' }, { horarioInicio: 'asc' }],
      })

      const diasOrdem = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

      // Agrupar por dia da semana
      const porDia = diasOrdem.map((dia) => ({
        dia,
        turmas: turmas
          .filter((t) => t.diaSemana === dia)
          .map((t) => ({
            id: t.id,
            horarioInicio: t.horarioInicio,
            horarioFim: t.horarioFim,
            capacidade: t.capacidade,
            alunosAtivos: t.alunos.filter((a) => a.aluno.ativo).length,
            alunos: t.alunos.filter((a) => a.aluno.ativo),
          })),
      }))

      return reply.status(200).send({ success: true, data: porDia })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao buscar quadro de horários' })
    }
  })
}
