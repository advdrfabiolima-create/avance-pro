import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma, Prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'
import { extrairGabaritoDeImagem, corrigirFolhaAvulsa } from '../../shared/gemini.ocr.service'
import type { GabaritoItem } from '../../shared/gemini.ocr.service'

const GabaritoItemSchema = z.object({
  ordem: z.number().int().min(1),
  tipo: z.enum(['objetiva', 'numerica', 'discursiva']),
  resposta: z.string().min(1),
})

export async function correcaoAvulsaRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /api/correcao-avulsa/modelos ──────────────────────────────────────
  // Diagnóstico: lista os modelos Gemini disponíveis para a chave configurada
  app.get('/modelos', { preHandler: autenticar }, async (_request, reply) => {
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
  // Envia foto do gabarito → Gemini extrai as respostas corretas
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
  // Corrige a folha do aluno sem salvar no banco (preview)
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

  // ── POST /api/correcao-avulsa ─────────────────────────────────────────────
  // Salva a correção no histórico do aluno
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
        gabarito: parse.data.gabarito,
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
        include: { aluno: { select: { id: true, nome: true, foto: true } } },
      })
      if (!correcao) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      return reply.send({ success: true, data: correcao })
    }
  )
}
