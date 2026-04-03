import type { FastifyInstance } from 'fastify'
import { prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'
import { OcrSpaceProvider } from '../../shared/ocrspace.provider'
import { parseOcrText } from '../../shared/ocr-parser'
import type { QuestaoInfo } from '../../shared/ocr-parser'

const ocrProvider = new OcrSpaceProvider()

// Tipos aceitos pelo sistema
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function ocrRoutes(app: FastifyInstance): Promise<void> {

  // ── POST /api/ocr — criar TentativaOcr ─────────────────────────────────────
  app.post<{
    Body: { alunoId: string; exercicioId: string; arquivoBase64: string; tipoArquivo: string }
  }>('/', { preHandler: autenticar }, async (request, reply) => {
    const { alunoId, exercicioId, arquivoBase64, tipoArquivo } = request.body

    if (!alunoId || !exercicioId || !arquivoBase64 || !tipoArquivo) {
      return reply.status(422).send({ success: false, message: 'Campos obrigatórios ausentes' })
    }
    if (!TIPOS_ACEITOS.includes(tipoArquivo)) {
      return reply.status(422).send({ success: false, message: `Tipo não suportado: ${tipoArquivo}. Use JPG, PNG, WebP ou PDF.` })
    }

    const [aluno, exercicio] = await Promise.all([
      prisma.aluno.findUnique({ where: { id: alunoId }, select: { id: true, nome: true } }),
      prisma.exercicio.findUnique({
        where: { id: exercicioId },
        select: {
          id: true, titulo: true, ativo: true,
          questoes: { select: { id: true, ordem: true, tipo: true }, orderBy: { ordem: 'asc' } },
        },
      }),
    ])

    if (!aluno) return reply.status(404).send({ success: false, message: 'Aluno não encontrado' })
    if (!exercicio) return reply.status(404).send({ success: false, message: 'Exercício não encontrado' })
    if (!exercicio.ativo) return reply.status(422).send({ success: false, message: 'Exercício inativo' })

    const questoesOcr = exercicio.questoes.filter((q) => q.tipo !== 'discursiva')
    if (questoesOcr.length === 0) {
      return reply.status(422).send({ success: false, message: 'Exercício não possui questões objetivas ou numéricas' })
    }

    const tentativaOcr = await prisma.tentativaOcr.create({
      data: { alunoId, exercicioId, arquivoBase64, tipoArquivo, status: 'pendente' },
    })

    return reply.status(201).send({ success: true, data: tentativaOcr })
  })

  // ── POST /api/ocr/:id/processar ─────────────────────────────────────────────
  // Chama OCR, parseia texto e cria um registro de RespostaOcrDetectada para
  // TODAS as questões (objetivas/numéricas), mesmo as não detectadas.
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
              questoes: {
                where: { tipo: { not: 'discursiva' } },
                select: { id: true, ordem: true, tipo: true },
                orderBy: { ordem: 'asc' },
              },
            },
          },
        },
      })

      if (!tentativaOcr) return reply.status(404).send({ success: false, message: 'Não encontrado' })
      if (tentativaOcr.status === 'confirmado') {
        return reply.status(422).send({ success: false, message: 'Já confirmado — não pode reprocessar' })
      }

      await prisma.tentativaOcr.update({ where: { id }, data: { status: 'processando', erroMensagem: null } })

      // ── Etapa 1: OCR ─────────────────────────────────────────────────────────
      let textoOcr: string
      try {
        const result = await ocrProvider.recognize(tentativaOcr.arquivoBase64, tentativaOcr.tipoArquivo)
        textoOcr = result.text
      } catch (err: any) {
        await prisma.tentativaOcr.update({
          where: { id },
          data: { status: 'erro', erroMensagem: err?.message ?? 'Erro no processamento OCR' },
        })
        return reply.status(502).send({ success: false, message: `Falha no OCR: ${err?.message}` })
      }

      // ── Etapa 2: Parsing heurístico ──────────────────────────────────────────
      const questoesInfo: QuestaoInfo[] = tentativaOcr.exercicio.questoes.map((q) => ({
        ordem: q.ordem,
        tipo: q.tipo as 'objetiva' | 'numerica' | 'discursiva',
        id: q.id,
      }))

      const detectadas = parseOcrText(textoOcr, questoesInfo)
      const detMap = new Map(detectadas.map((d) => [d.questaoOrdem, d]))

      // ── Etapa 3: Criar/recriar uma linha por questão ─────────────────────────
      // Sempre cria registro para TODAS as questões OCR-suportadas.
      // Questões não detectadas entram com letraDetectada/valorDetectado = null.
      await prisma.respostaOcrDetectada.deleteMany({ where: { tentativaOcrId: id } })

      const linhas = tentativaOcr.exercicio.questoes.map((q) => {
        const det = detMap.get(q.ordem)
        return {
          tentativaOcrId: id,
          questaoOrdem: q.ordem,
          questaoId: q.id,
          tipoQuestao: q.tipo,
          letraDetectada: det?.letraDetectada ?? null,
          valorDetectado: det?.valorDetectado ?? null,
          confianca: det ? det.confianca : null,
          // inicializar letraFinal/valorFinal com o que o OCR detectou
          letraFinal: det?.letraDetectada ?? null,
          valorFinal: det?.valorDetectado ?? null,
          revisadaManual: false,
        }
      })

      await prisma.respostaOcrDetectada.createMany({ data: linhas })

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

  // ── GET /api/ocr — listar ────────────────────────────────────────────────────
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
          where, skip, take: parseInt(pageSize),
          orderBy: { criadoEm: 'desc' },
          select: {
            id: true, status: true, criadoEm: true, tipoArquivo: true,
            alunoId: true, exercicioId: true, tentativaId: true,
            aluno: { select: { id: true, nome: true } },
            exercicio: { select: { id: true, titulo: true } },
            _count: { select: { respostasDetectadas: true } },
          },
        }),
      ])

      return reply.send({ success: true, data: { items, total, page: parseInt(page) } })
    }
  )

  // ── PUT /api/ocr/:id/respostas ───────────────────────────────────────────────
  // Salva as respostas finais revisadas pelo usuário.
  // Cada item identifica uma RespostaOcrDetectada pelo id e atualiza
  // letraFinal/valorFinal e marca revisadaManual=true.
  app.put<{
    Params: { id: string }
    Body: {
      respostas: Array<{
        respostaOcrId: string
        letraFinal: string | null
        valorFinal: number | null
        revisadaManual: boolean
      }>
    }
  }>('/:id/respostas', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params
    const { respostas } = request.body

    const tentativaOcr = await prisma.tentativaOcr.findUnique({
      where: { id }, select: { id: true, status: true },
    })
    if (!tentativaOcr) return reply.status(404).send({ success: false, message: 'Não encontrado' })
    if (tentativaOcr.status === 'confirmado') {
      return reply.status(422).send({ success: false, message: 'Já confirmado' })
    }

    // Atualiza cada resposta em série (poderia ser transaction, mas são poucas)
    for (const r of respostas) {
      await prisma.respostaOcrDetectada.update({
        where: { id: r.respostaOcrId },
        data: {
          letraFinal: r.letraFinal,
          valorFinal: r.valorFinal,
          revisadaManual: r.revisadaManual,
        },
      })
    }

    const updated = await _buscarCompleto(id)
    return reply.send({ success: true, data: updated })
  })

  // ── POST /api/ocr/:id/confirmar ─────────────────────────────────────────────
  // Consolida a tentativa usando letraFinal/valorFinal (o que o usuário confirmou).
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
                include: { alternativas: true, respostaCorreta: true },
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
      if (tentativaOcr.status !== 'revisao') {
        return reply.status(422).send({ success: false, message: 'Processe o arquivo antes de confirmar' })
      }

      const questoes = tentativaOcr.exercicio.questoes
      const detectoesMap = new Map(tentativaOcr.respostasDetectadas.map((d) => [d.questaoId, d]))

      let pontuacaoTotal = 0
      let totalPontos = 0
      const respostasParaCriar: any[] = []
      const erros: Array<{ questaoId: string; enunciado: string; tipo: string }> = []

      for (const questao of questoes) {
        const pts = parseFloat(questao.pontos.toString())
        totalPontos += pts

        const d = detectoesMap.get(questao.id)
        const rc = questao.respostaCorreta
        let correta = false
        let alternativaId: string | null = null
        let valorNumerico: number | null = null
        let textoResposta: string | null = null

        if (d && rc) {
          if (questao.tipo === 'objetiva') {
            // Usar letraFinal (revisada pelo usuário); fallback para letraDetectada
            const letra = (d.letraFinal ?? d.letraDetectada)?.toUpperCase()
            if (letra) {
              const alt = questao.alternativas.find((a) => a.letra.toUpperCase() === letra)
              if (alt) {
                alternativaId = alt.id
                correta = alt.id === rc.alternativaId
              }
            }
          } else if (questao.tipo === 'numerica') {
            const raw = d.valorFinal ?? d.valorDetectado
            if (raw != null) {
              valorNumerico = parseFloat(raw.toString())
              if (rc.valorNumerico != null) {
                const tol = rc.tolerancia != null ? parseFloat(rc.tolerancia.toString()) : 0
                correta = Math.abs(valorNumerico - parseFloat(rc.valorNumerico.toString())) <= tol
              }
            }
          }
          // discursiva: sem suporte OCR, correta = false, sem penalidade de erro recorrente
        }

        const pontosObtidos = correta ? pts : 0
        pontuacaoTotal += pontosObtidos

        respostasParaCriar.push({
          questaoId: questao.id,
          alternativaId,
          valorNumerico,
          textoResposta,
          correta,
          pontosObtidos,
        })

        if (!correta && questao.tipo !== 'discursiva') {
          erros.push({ questaoId: questao.id, enunciado: questao.enunciado, tipo: questao.tipo })
        }
      }

      // ── Gravar tentativa + respostas ─────────────────────────────────────────
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
            textoResposta: r.textoResposta,
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

      // ── Atualizar erros recorrentes (fora da transaction) ────────────────────
      for (const err of erros) {
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
            const enunc = err.enunciado.length > 80 ? err.enunciado.substring(0, 80) + '...' : err.enunciado
            await prisma.sugestaoReforco.create({
              data: {
                alunoId: tentativaOcr.alunoId,
                erroRecorrenteId: existing.id,
                texto: `Revisar questão: "${enunc}"`,
              },
            })
          }
        } else {
          await prisma.erroRecorrente.create({
            data: { alunoId: tentativaOcr.alunoId, questaoId: err.questaoId, contagem: 1, ultimaOcorrencia: agora },
          })
        }
      }

      const acertos = respostasParaCriar.filter((r) => r.correta).map((r) => r.questaoId)
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

// ── Buscar completo (usado em múltiplos endpoints) ───────────────────────────
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
