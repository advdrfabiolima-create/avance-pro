import type { FastifyInstance } from 'fastify'
import { prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'
import { OcrSpaceProvider } from '../../shared/ocrspace.provider'
import { parseOcrText } from '../../shared/ocr-parser'
import type { QuestaoInfo } from '../../shared/ocr-parser'

const ocrProvider = new OcrSpaceProvider()

export async function ocrRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/ocr — criar TentativaOcr ─────────────────────────────────────
  app.post<{
    Body: { alunoId: string; exercicioId: string; imagemBase64: string }
  }>('/', { preHandler: autenticar }, async (request, reply) => {
    const { alunoId, exercicioId, imagemBase64 } = request.body

    if (!alunoId || !exercicioId || !imagemBase64) {
      return reply.status(422).send({ success: false, message: 'alunoId, exercicioId e imagemBase64 são obrigatórios' })
    }

    const [aluno, exercicio] = await Promise.all([
      prisma.aluno.findUnique({ where: { id: alunoId }, select: { id: true, nome: true } }),
      prisma.exercicio.findUnique({
        where: { id: exercicioId },
        select: { id: true, titulo: true, questoes: { select: { id: true, ordem: true, tipo: true }, orderBy: { ordem: 'asc' } } },
      }),
    ])

    if (!aluno) return reply.status(404).send({ success: false, message: 'Aluno não encontrado' })
    if (!exercicio) return reply.status(404).send({ success: false, message: 'Exercício não encontrado' })

    const tentativaOcr = await prisma.tentativaOcr.create({
      data: { alunoId, exercicioId, imagemBase64, status: 'pendente' },
    })

    return reply.status(201).send({ success: true, data: tentativaOcr })
  })

  // ── POST /api/ocr/:id/processar — chamar OCR + parser ─────────────────────
  app.post<{ Params: { id: string } }>(
    '/:id/processar',
    { preHandler: autenticar },
    async (request, reply) => {
      const { id } = request.params

      const tentativaOcr = await prisma.tentativaOcr.findUnique({
        where: { id },
        include: {
          exercicio: {
            include: {
              questoes: { select: { id: true, ordem: true, tipo: true }, orderBy: { ordem: 'asc' } },
            },
          },
        },
      })

      if (!tentativaOcr) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      if (tentativaOcr.status === 'confirmado') {
        return reply.status(422).send({ success: false, message: 'Já confirmado' })
      }

      // Mark as processing
      await prisma.tentativaOcr.update({ where: { id }, data: { status: 'processando', erroMensagem: null } })

      let textoOcr: string
      try {
        const result = await ocrProvider.recognize(tentativaOcr.imagemBase64)
        textoOcr = result.text
      } catch (err: any) {
        await prisma.tentativaOcr.update({
          where: { id },
          data: { status: 'erro', erroMensagem: err?.message ?? 'Erro no OCR' },
        })
        return reply.status(502).send({ success: false, message: `Erro no OCR: ${err?.message}` })
      }

      // Parse detected responses
      const questoesInfo: QuestaoInfo[] = tentativaOcr.exercicio.questoes.map((q) => ({
        ordem: q.ordem,
        tipo: q.tipo as 'objetiva' | 'numerica' | 'discursiva',
        id: q.id,
      }))
      const respostasDetectadas = parseOcrText(textoOcr, questoesInfo)

      // Delete existing detections (re-process)
      await prisma.respostaOcrDetectada.deleteMany({ where: { tentativaOcrId: id } })

      if (respostasDetectadas.length > 0) {
        await prisma.respostaOcrDetectada.createMany({
          data: respostasDetectadas.map((r) => ({
            tentativaOcrId: id,
            questaoOrdem: r.questaoOrdem,
            questaoId: r.questaoId,
            tipoDetectado: r.tipoDetectado,
            letraDetectada: r.letraDetectada,
            valorDetectado: r.valorDetectado,
            confianca: r.confianca,
            confirmada: false,
          })),
        })
      }

      await prisma.tentativaOcr.update({
        where: { id },
        data: { textoOcr, status: 'revisao' },
      })

      const updated = await _buscarCompleto(id)
      return reply.send({ success: true, data: updated })
    }
  )

  // ── GET /api/ocr/:id ────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: autenticar },
    async (request, reply) => {
      const data = await _buscarCompleto(request.params.id)
      if (!data) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      return reply.send({ success: true, data })
    }
  )

  // ── GET /api/ocr — listar por aluno ────────────────────────────────────────
  app.get<{ Querystring: { alunoId?: string; page?: string; pageSize?: string } }>(
    '/',
    { preHandler: autenticar },
    async (request, reply) => {
      const { alunoId, page = '1', pageSize = '20' } = request.query
      const skip = (parseInt(page) - 1) * parseInt(pageSize)

      const where: any = {}
      if (alunoId) where.alunoId = alunoId

      const [total, items] = await Promise.all([
        prisma.tentativaOcr.count({ where }),
        prisma.tentativaOcr.findMany({
          where,
          skip,
          take: parseInt(pageSize),
          orderBy: { criadoEm: 'desc' },
          select: {
            id: true,
            status: true,
            criadoEm: true,
            alunoId: true,
            exercicioId: true,
            tentativaId: true,
            aluno: { select: { id: true, nome: true } },
            exercicio: { select: { id: true, titulo: true } },
            _count: { select: { respostasDetectadas: true } },
          },
        }),
      ])

      return reply.send({ success: true, data: { items, total, page: parseInt(page) } })
    }
  )

  // ── PUT /api/ocr/:id/respostas — atualizar resposta detectada ───────────────
  app.put<{
    Params: { id: string }
    Body: {
      respostas: Array<{
        respostaOcrId: string
        letraDetectada?: string | null
        valorDetectado?: number | null
        confirmada: boolean
      }>
    }
  }>('/:id/respostas', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params
    const { respostas } = request.body

    const tentativaOcr = await prisma.tentativaOcr.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!tentativaOcr) return reply.status(404).send({ success: false, message: 'Não encontrado' })
    if (tentativaOcr.status === 'confirmado') {
      return reply.status(422).send({ success: false, message: 'Já confirmado' })
    }

    for (const r of respostas) {
      await prisma.respostaOcrDetectada.update({
        where: { id: r.respostaOcrId },
        data: {
          letraDetectada: r.letraDetectada ?? null,
          valorDetectado: r.valorDetectado ?? null,
          confirmada: r.confirmada,
        },
      })
    }

    const updated = await _buscarCompleto(id)
    return reply.send({ success: true, data: updated })
  })

  // ── POST /api/ocr/:id/confirmar — criar Tentativa real ─────────────────────
  app.post<{ Params: { id: string } }>(
    '/:id/confirmar',
    { preHandler: autenticar },
    async (request, reply) => {
      const { id } = request.params

      const tentativaOcr = await prisma.tentativaOcr.findUnique({
        where: { id },
        include: {
          exercicio: {
            include: {
              questoes: {
                include: {
                  alternativas: true,
                  respostaCorreta: true,
                },
                orderBy: { ordem: 'asc' },
              },
            },
          },
          respostasDetectadas: true,
        },
      })

      if (!tentativaOcr) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      if (tentativaOcr.status === 'confirmado') {
        return reply.status(422).send({ success: false, message: 'Já confirmado' })
      }

      const questoes = tentativaOcr.exercicio.questoes
      const detecoes = tentativaOcr.respostasDetectadas

      // Build respostas for submission
      const respostasParaCriar: any[] = []
      let pontuacaoTotal = 0
      let totalPontos = 0

      for (const questao of questoes) {
        const pts = parseFloat(questao.pontos.toString())
        totalPontos += pts

        const deteccao = detecoes.find((d) => d.questaoId === questao.id)
        const rc = questao.respostaCorreta
        let correta = false
        let alternativaId: string | null = null
        let valorNumerico: number | null = null

        if (deteccao && rc) {
          if (questao.tipo === 'objetiva' && deteccao.letraDetectada) {
            // Find alternativa by letra
            const alt = questao.alternativas.find(
              (a) => a.letra.toUpperCase() === deteccao.letraDetectada!.toUpperCase()
            )
            if (alt) {
              alternativaId = alt.id
              correta = alt.id === rc.alternativaId
            }
          } else if (questao.tipo === 'numerica' && deteccao.valorDetectado != null) {
            valorNumerico = parseFloat(deteccao.valorDetectado.toString())
            if (rc.valorNumerico != null) {
              const tol = rc.tolerancia != null ? parseFloat(rc.tolerancia.toString()) : 0
              correta = Math.abs(valorNumerico - parseFloat(rc.valorNumerico.toString())) <= tol
            }
          }
        }

        const pontosObtidos = correta ? pts : 0
        pontuacaoTotal += pontosObtidos

        respostasParaCriar.push({
          questaoId: questao.id,
          alternativaId,
          valorNumerico,
          correta: deteccao ? correta : false,
          pontosObtidos,
        })
      }

      // Create Tentativa + RespostaAluno in transaction
      const agora = new Date()
      const tentativa = await prisma.$transaction(async (tx) => {
        const t = await tx.tentativa.create({
          data: {
            alunoId: tentativaOcr.alunoId,
            exercicioId: tentativaOcr.exercicioId,
            iniciadaEm: agora,
            finalizadaEm: agora,
            corrigida: true,
            pontuacao: pontuacaoTotal,
            totalPontos,
          },
        })

        await tx.respostaAluno.createMany({
          data: respostasParaCriar.map((r) => ({
            tentativaId: t.id,
            questaoId: r.questaoId,
            alternativaId: r.alternativaId,
            valorNumerico: r.valorNumerico,
            correta: r.correta,
            pontosObtidos: r.pontosObtidos,
          })),
        })

        await tx.tentativaOcr.update({
          where: { id },
          data: { status: 'confirmado', tentativaId: t.id },
        })

        return t
      })

      // Update recurring errors (outside tx)
      const erros = respostasParaCriar.filter((r) => !r.correta)
      const acertos = respostasParaCriar.filter((r) => r.correta).map((r) => r.questaoId)

      for (const err of erros) {
        const questao = questoes.find((q) => q.id === err.questaoId)!
        const existing = await prisma.erroRecorrente.findUnique({
          where: { alunoId_questaoId: { alunoId: tentativaOcr.alunoId, questaoId: err.questaoId } },
        })
        if (existing) {
          const nc = existing.contagem + 1
          await prisma.erroRecorrente.update({
            where: { id: existing.id },
            data: { contagem: nc, ultimaOcorrencia: agora, resolvido: false },
          })
          if (nc % 3 === 0) {
            await prisma.sugestaoReforco.create({
              data: {
                alunoId: tentativaOcr.alunoId,
                erroRecorrenteId: existing.id,
                texto: `Revisar questão: "${questao.enunciado.substring(0, 80)}..."`,
              },
            })
          }
        } else {
          await prisma.erroRecorrente.create({
            data: { alunoId: tentativaOcr.alunoId, questaoId: err.questaoId, contagem: 1, ultimaOcorrencia: agora },
          })
        }
      }

      if (acertos.length > 0) {
        await prisma.erroRecorrente.updateMany({
          where: { alunoId: tentativaOcr.alunoId, questaoId: { in: acertos } },
          data: { resolvido: true },
        })
      }

      return reply.send({ success: true, data: { tentativaId: tentativa.id } })
    }
  )
}

async function _buscarCompleto(id: string) {
  return prisma.tentativaOcr.findUnique({
    where: { id },
    include: {
      aluno: { select: { id: true, nome: true, foto: true } },
      exercicio: {
        include: {
          materia: { select: { nome: true, codigo: true } },
          nivel: { select: { codigo: true, descricao: true } },
          questoes: {
            orderBy: { ordem: 'asc' },
            include: {
              alternativas: { orderBy: { letra: 'asc' } },
              respostaCorreta: true,
            },
          },
        },
      },
      respostasDetectadas: { orderBy: { questaoOrdem: 'asc' } },
    },
  })
}
