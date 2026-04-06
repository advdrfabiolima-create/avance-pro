import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'
import {
  extrairGabaritoDeImagem,
  corrigirFolhaAvulsa,
  corrigirFolhaEstruturada,
} from '../../shared/gemini.ocr.service'
import type { GabaritoItem } from '../../shared/gemini.ocr.service'
import { registrarFeedbacks, processarFeedbacksPendentes } from '../../shared/learning'

const GabaritoItemSchema = z.object({
  ordem: z.number().int().min(1),
  tipo: z.enum(['objetiva', 'numerica', 'discursiva']),
  resposta: z.string().min(1),
})

export async function correcaoAvulsaRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /api/correcao-avulsa/modelos ──────────────────────────────────────
  app.get('/modelos', async (_request, reply) => {
    const apiKey = process.env['GOOGLE_API_KEY']
    if (!apiKey) return reply.status(503).send({ success: false, message: 'GOOGLE_API_KEY não configurada' })

    const https = await import('https')
    const result: string = await new Promise((resolve, reject) => {
      const req = https.request(
        { hostname: 'generativelanguage.googleapis.com', path: `/v1beta/models?key=${apiKey}`, method: 'GET' },
        (res) => { let d = ''; res.on('data', (c) => { d += c }); res.on('end', () => resolve(d)) }
      )
      req.on('error', reject)
      req.end()
    })

    try {
      const parsed = JSON.parse(result)
      const nomes = (parsed.models ?? []).map((m: any) => m.name)
      return reply.send({ success: true, data: nomes, raw: parsed })
    } catch {
      return reply.send({ success: false, raw: result })
    }
  })

  // ── POST /api/correcao-avulsa/extrair-gabarito ────────────────────────────
  app.post<{
    Body: { arquivoBase64: string; tipoArquivo: string }
  }>('/extrair-gabarito', { preHandler: autenticar }, async (request, reply) => {
    const { arquivoBase64, tipoArquivo } = request.body

    if (!arquivoBase64 || !tipoArquivo) {
      return reply.status(422).send({ success: false, message: 'arquivoBase64 e tipoArquivo são obrigatórios' })
    }
    if (!process.env['GOOGLE_API_KEY']) {
      return reply.status(503).send({ success: false, message: 'GOOGLE_API_KEY não configurada no servidor' })
    }

    try {
      const gabarito = await extrairGabaritoDeImagem(arquivoBase64, tipoArquivo)
      return reply.send({ success: true, data: gabarito })
    } catch (err: any) {
      console.error('[CorrecaoAvulsa] extrairGabarito erro:', err?.message)
      return reply.status(502).send({ success: false, message: `Falha ao extrair gabarito: ${err?.message}` })
    }
  })

  // ── POST /api/correcao-avulsa/processar ───────────────────────────────────
  // Preview sem salvar (legado)
  app.post<{
    Body: {
      arquivoBase64: string
      tipoArquivo: string
      gabarito: Array<{ ordem: number; tipo: string; resposta: string }>
    }
  }>('/processar', { preHandler: autenticar }, async (request, reply) => {
    const parse = z.object({
      arquivoBase64: z.string().min(1),
      tipoArquivo: z.string().min(1),
      gabarito: z.array(GabaritoItemSchema).min(1),
    }).safeParse(request.body)

    if (!parse.success) {
      return reply.status(422).send({ success: false, message: 'Dados inválidos', errors: parse.error.flatten() })
    }

    if (!process.env['GOOGLE_API_KEY']) {
      return reply.status(503).send({ success: false, message: 'GOOGLE_API_KEY não configurada no servidor' })
    }

    const { arquivoBase64, tipoArquivo, gabarito } = parse.data

    try {
      const questoes = await corrigirFolhaAvulsa(arquivoBase64, tipoArquivo, gabarito as GabaritoItem[])
      const acertos = questoes.filter((q) => q.correta).length
      const naoDetectadas = questoes.filter((q) => q.respostaAluno === null).length
      return reply.send({
        success: true,
        data: {
          totalQuestoes: questoes.length,
          acertos,
          erros: questoes.length - acertos - naoDetectadas,
          naoDetectadas,
          percentual: questoes.length > 0 ? Math.round((acertos / questoes.length) * 100) : 0,
          questoes,
        },
      })
    } catch (err: any) {
      console.error('[CorrecaoAvulsa] processar erro:', err?.message)
      return reply.status(502).send({ success: false, message: `Falha na correção: ${err?.message}` })
    }
  })

  // ── POST /api/correcao-avulsa/corrigir ────────────────────────────────────
  // Cria registro, processa IA com classificação pedagógica e salva questões
  app.post<{
    Body: {
      alunoId: string
      titulo?: string
      disciplina?: string
      arquivoBase64: string
      tipoArquivo: string
      gabaritoFonte: 'manual' | 'foto'
      gabaritoBase64?: string
      gabaritoMime?: string
      gabarito: Array<{ ordem: number; tipo: string; resposta: string }>
    }
  }>('/corrigir', { preHandler: autenticar }, async (request, reply) => {
    const parse = z.object({
      alunoId: z.string().uuid(),
      titulo: z.string().optional(),
      disciplina: z.string().optional(),
      arquivoBase64: z.string().min(1),
      tipoArquivo: z.string().min(1),
      gabaritoFonte: z.enum(['manual', 'foto']),
      gabaritoBase64: z.string().optional(),
      gabaritoMime: z.string().optional(),
      gabarito: z.array(GabaritoItemSchema).min(1),
    }).safeParse(request.body)

    if (!parse.success) {
      return reply.status(422).send({ success: false, message: 'Dados inválidos', errors: parse.error.flatten() })
    }

    if (!process.env['GOOGLE_API_KEY']) {
      return reply.status(503).send({ success: false, message: 'GOOGLE_API_KEY não configurada no servidor' })
    }

    const aluno = await prisma.aluno.findUnique({ where: { id: parse.data.alunoId }, select: { id: true } })
    if (!aluno) return reply.status(404).send({ success: false, message: 'Aluno não encontrado' })

    // 1. Cria registro com status processando
    const correcao = await prisma.correcaoAvulsa.create({
      data: {
        alunoId: parse.data.alunoId,
        titulo: parse.data.titulo,
        disciplina: parse.data.disciplina,
        arquivoBase64: parse.data.arquivoBase64,
        tipoArquivo: parse.data.tipoArquivo,
        gabaritoBase64: parse.data.gabaritoBase64,
        gabaritoMime: parse.data.gabaritoMime,
        gabaritoFonte: parse.data.gabaritoFonte,
        gabarito: parse.data.gabarito as Prisma.InputJsonValue,
        status: 'processando',
      },
    })

    try {
      // 2. Processa com Gemini
      const resultados = await corrigirFolhaEstruturada(
        parse.data.arquivoBase64,
        parse.data.tipoArquivo,
        parse.data.gabarito as GabaritoItem[],
        parse.data.disciplina,
        parse.data.gabaritoBase64,
        parse.data.gabaritoMime,
      )

      const acertos = resultados.filter((r) => r.correta).length
      const percentual = resultados.length > 0 ? Math.round((acertos / resultados.length) * 100) : 0

      // 3. Salva questões
      await prisma.correcaoAvulsaQuestao.createMany({
        data: resultados.map((r) => ({
          correcaoId: correcao.id,
          ordem: r.questaoOrdem,
          tipo: r.tipo,
          respostaGabarito: r.respostaGabarito,
          respostaAluno: r.respostaAluno,
          textoDetectado: r.textoDetectado,
          confianca: r.confianca,
          statusCorrecao: r.statusCorrecao,
          correta: r.correta,
          avaliacaoIA: r.avaliacaoIA,
          justificativa: r.justificativa,
          revisadaManual: r.revisadaManual,
        })),
      })

      // 4. Atualiza totais e status
      const correcaoFinal = await prisma.correcaoAvulsa.update({
        where: { id: correcao.id },
        data: {
          status: 'revisao',
          totalQuestoes: resultados.length,
          totalAcertos: acertos,
          percentual,
          resultadoJson: resultados as unknown as Prisma.InputJsonValue,
        },
        include: {
          questoes: { orderBy: { ordem: 'asc' } },
          aluno: { select: { id: true, nome: true, foto: true } },
        },
      })

      return reply.status(201).send({ success: true, data: correcaoFinal })
    } catch (err: any) {
      // Marca como erro mas não apaga o registro
      await prisma.correcaoAvulsa.update({
        where: { id: correcao.id },
        data: { status: 'erro', erroMensagem: err?.message },
      })
      console.error('[CorrecaoAvulsa] corrigir erro:', err?.message)
      return reply.status(502).send({ success: false, message: `Falha na correção: ${err?.message}` })
    }
  })

  // ── PUT /api/correcao-avulsa/:id/questoes ─────────────────────────────────
  // Atualiza decisões manuais do professor em lote
  app.put<{
    Params: { id: string }
    Body: { questoes: Array<{ ordem: number; decisaoManual: boolean; statusManual: string }> }
  }>('/:id/questoes', { preHandler: autenticar }, async (request, reply) => {
    const parse = z.object({
      questoes: z.array(z.object({
        ordem: z.number().int().min(1),
        decisaoManual: z.boolean(),
        statusManual: z.enum(['correta', 'incorreta_por_ortografia', 'incorreta_por_acentuacao', 'incorreta_por_pontuacao', 'incorreta_por_maiuscula', 'incorreta_por_regra', 'revisar']),
      })).min(1),
    }).safeParse(request.body)

    if (!parse.success) {
      return reply.status(422).send({ success: false, message: 'Dados inválidos', errors: parse.error.flatten() })
    }

    const correcao = await prisma.correcaoAvulsa.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    })
    if (!correcao) return reply.status(404).send({ success: false, message: 'Correção não encontrada' })

    await Promise.all(
      parse.data.questoes.map((q) =>
        prisma.correcaoAvulsaQuestao.updateMany({
          where: { correcaoId: request.params.id, ordem: q.ordem },
          data: {
            revisadaManual: true,
            decisaoManual: q.decisaoManual,
            statusManual: q.statusManual as any,
            correta: q.decisaoManual,
          },
        })
      )
    )

    const questoes = await prisma.correcaoAvulsaQuestao.findMany({
      where: { correcaoId: request.params.id },
      orderBy: { ordem: 'asc' },
    })

    return reply.send({ success: true, data: questoes })
  })

  // ── POST /api/correcao-avulsa/:id/confirmar ───────────────────────────────
  // Finaliza a correção após revisão
  app.post<{ Params: { id: string } }>(
    '/:id/confirmar',
    { preHandler: autenticar },
    async (request, reply) => {
      const correcao = await prisma.correcaoAvulsa.findUnique({
        where: { id: request.params.id },
        include: { questoes: true },
      })
      if (!correcao) return reply.status(404).send({ success: false, message: 'Correção não encontrada' })
      if (correcao.status === 'confirmado') {
        return reply.send({ success: true, data: correcao })
      }

      // Recalcula totais com decisões manuais
      const acertos = correcao.questoes.filter((q) =>
        q.revisadaManual ? q.decisaoManual === true : q.correta
      ).length
      const percentual = correcao.questoes.length > 0
        ? Math.round((acertos / correcao.questoes.length) * 100)
        : 0

      const updated = await prisma.correcaoAvulsa.update({
        where: { id: request.params.id },
        data: {
          status: 'confirmado',
          confirmadoEm: new Date(),
          totalAcertos: acertos,
          percentual,
        },
        include: {
          questoes: { orderBy: { ordem: 'asc' } },
          aluno: { select: { id: true, nome: true, foto: true } },
        },
      })

      // ── Captura feedback para aprendizado contínuo ──────────────────────────
      // Execução não-bloqueante: não atrasa a resposta ao usuário
      ;(async () => {
        try {
          const disciplina = correcao.disciplina ?? 'geral'
          const feedbacks = correcao.questoes
            .filter((q) => q.respostaAluno !== null)
            .map((q) => {
              const statusFinal = (q.statusManual ?? q.statusCorrecao) as string
              const ajustado = q.statusManual !== null && q.statusManual !== q.statusCorrecao
              return {
                disciplina,
                gabarito: q.respostaGabarito,
                respostaAluno: q.respostaAluno!,
                statusIa: q.statusCorrecao as string,
                statusFinal,
                ajustado,
                motivoIa: q.justificativa,
              }
            })

          await registrarFeedbacks(feedbacks)
          // Processa padrões em background — só ajustes com professor discordando
          const temAjustes = feedbacks.some((f) => f.ajustado)
          if (temAjustes) await processarFeedbacksPendentes()
        } catch (err: any) {
          console.error('[learning] Erro ao registrar feedback:', err?.message)
        }
      })()

      return reply.send({ success: true, data: updated })
    }
  )

  // ── POST /api/correcao-avulsa ─────────────────────────────────────────────
  // Salva correção no histórico (legado — sem questões estruturadas)
  app.post<{
    Body: {
      alunoId: string
      titulo?: string
      disciplina?: string
      arquivoBase64: string
      tipoArquivo: string
      gabaritoFonte: 'manual' | 'foto'
      gabarito: Array<{ ordem: number; tipo: string; resposta: string }>
      resultadoJson: object
    }
  }>('/', { preHandler: autenticar }, async (request, reply) => {
    const parse = z.object({
      alunoId: z.string().uuid(),
      titulo: z.string().optional(),
      disciplina: z.string().optional(),
      arquivoBase64: z.string().min(1),
      tipoArquivo: z.string().min(1),
      gabaritoFonte: z.enum(['manual', 'foto']),
      gabarito: z.array(GabaritoItemSchema).min(1),
      resultadoJson: z.record(z.unknown()),
    }).safeParse(request.body)

    if (!parse.success) {
      return reply.status(422).send({ success: false, message: 'Dados inválidos', errors: parse.error.flatten() })
    }

    const aluno = await prisma.aluno.findUnique({ where: { id: parse.data.alunoId }, select: { id: true } })
    if (!aluno) return reply.status(404).send({ success: false, message: 'Aluno não encontrado' })

    const correcao = await prisma.correcaoAvulsa.create({
      data: {
        alunoId: parse.data.alunoId,
        titulo: parse.data.titulo,
        disciplina: parse.data.disciplina,
        arquivoBase64: parse.data.arquivoBase64,
        tipoArquivo: parse.data.tipoArquivo,
        gabaritoFonte: parse.data.gabaritoFonte,
        gabarito: parse.data.gabarito as Prisma.InputJsonValue,
        resultadoJson: parse.data.resultadoJson as Prisma.InputJsonValue,
        status: 'confirmado',
      },
    })

    return reply.status(201).send({ success: true, data: correcao })
  })

  // ── GET /api/correcao-avulsa ──────────────────────────────────────────────
  app.get<{ Querystring: { alunoId?: string; page?: string; pageSize?: string } }>(
    '/',
    { preHandler: autenticar },
    async (request, reply) => {
      const { alunoId, page = '1', pageSize = '20' } = request.query
      const skip = (parseInt(page) - 1) * parseInt(pageSize)
      const where: any = {}
      if (alunoId) where.alunoId = alunoId

      const [total, items] = await Promise.all([
        prisma.correcaoAvulsa.count({ where }),
        prisma.correcaoAvulsa.findMany({
          where, skip, take: parseInt(pageSize),
          orderBy: { criadoEm: 'desc' },
          select: {
            id: true, titulo: true, disciplina: true, gabaritoFonte: true,
            status: true, criadoEm: true, resultadoJson: true,
            totalQuestoes: true, totalAcertos: true, percentual: true,
            aluno: { select: { id: true, nome: true } },
          },
        }),
      ])

      return reply.send({ success: true, data: { items, total, page: parseInt(page) } })
    }
  )

  // ── GET /api/correcao-avulsa/:id ──────────────────────────────────────────
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: autenticar },
    async (request, reply) => {
      const correcao = await prisma.correcaoAvulsa.findUnique({
        where: { id: request.params.id },
        include: {
          aluno: { select: { id: true, nome: true, foto: true } },
          questoes: { orderBy: { ordem: 'asc' } },
        },
      })
      if (!correcao) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      return reply.send({ success: true, data: correcao })
    }
  )
}
