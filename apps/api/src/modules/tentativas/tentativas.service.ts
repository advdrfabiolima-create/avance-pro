import { prisma } from '@kumon-advance/db'
import type { CriarTentativaInput, SubmeterRespostasInput, FiltrosTentativaInput } from './tentativas.schema'

const LIMIAR_ERRO_RECORRENTE = 3

function normalizar(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function gerarSugestao(enunciado: string, tipo: string): string {
  const base = enunciado.length > 80 ? enunciado.substring(0, 80) + '...' : enunciado
  if (tipo === 'objetiva') return `Revisar o conceito abordado na questão: "${base}". Tente resolver exercícios similares.`
  if (tipo === 'numerica') return `Praticar cálculos do tipo: "${base}". Refaça os passos da resolução.`
  return `Estudar o conteúdo relacionado à questão: "${base}". Leia o material de apoio.`
}

export const tentativasService = {
  async listar(filtros: FiltrosTentativaInput) {
    const { page, pageSize, alunoId, exercicioId, corrigida } = filtros
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (alunoId) where.alunoId = alunoId
    if (exercicioId) where.exercicioId = exercicioId
    if (corrigida !== undefined) where.corrigida = corrigida

    const [total, items] = await Promise.all([
      prisma.tentativa.count({ where }),
      prisma.tentativa.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { iniciadaEm: 'desc' },
        include: {
          aluno: { select: { id: true, nome: true, foto: true } },
          exercicio: {
            select: {
              id: true,
              titulo: true,
              materia: { select: { nome: true, codigo: true } },
              nivel: { select: { codigo: true, descricao: true } },
              _count: { select: { questoes: true } },
            },
          },
        },
      }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async buscarPorId(id: string) {
    const tentativa = await prisma.tentativa.findUnique({
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
        respostasAluno: {
          include: {
            questao: { select: { id: true, enunciado: true, tipo: true, pontos: true } },
            alternativa: true,
          },
        },
      },
    })
    if (!tentativa) throw { statusCode: 404, message: 'Tentativa não encontrada' }
    return tentativa
  },

  async criar(data: CriarTentativaInput) {
    // Verificar que exercício existe e está ativo
    const exercicio = await prisma.exercicio.findUnique({
      where: { id: data.exercicioId },
      include: { questoes: true },
    })
    if (!exercicio) throw { statusCode: 404, message: 'Exercício não encontrado' }
    if (!exercicio.ativo) throw { statusCode: 422, message: 'Exercício inativo' }
    if (exercicio.questoes.length === 0) throw { statusCode: 422, message: 'Exercício sem questões' }

    // Verificar que aluno existe
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } })
    if (!aluno) throw { statusCode: 404, message: 'Aluno não encontrado' }

    return prisma.tentativa.create({
      data: {
        alunoId: data.alunoId,
        exercicioId: data.exercicioId,
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        exercicio: {
          include: {
            materia: { select: { nome: true, codigo: true } },
            nivel: { select: { codigo: true, descricao: true } },
            questoes: {
              orderBy: { ordem: 'asc' },
              include: {
                alternativas: { orderBy: { letra: 'asc' } },
              },
            },
          },
        },
      },
    })
  },

  async submeterECorrigir(tentativaId: string, data: SubmeterRespostasInput) {
    const tentativa = await prisma.tentativa.findUnique({
      where: { id: tentativaId },
      include: {
        exercicio: {
          include: {
            questoes: {
              include: {
                respostaCorreta: true,
                alternativas: true,
              },
            },
          },
        },
      },
    })
    if (!tentativa) throw { statusCode: 404, message: 'Tentativa não encontrada' }
    if (tentativa.corrigida) throw { statusCode: 422, message: 'Tentativa já foi corrigida' }

    const agora = new Date()
    let pontuacaoTotal = 0
    let totalPontos = 0
    const errosNestaTentativa: Array<{ questaoId: string; enunciado: string; tipo: string }> = []

    // Processar cada resposta
    const respostasParaCriar: any[] = []

    for (const questao of tentativa.exercicio.questoes) {
      const pontosQuestao = parseFloat(questao.pontos.toString())
      totalPontos += pontosQuestao

      const respostaAluno = data.respostas.find((r) => r.questaoId === questao.id)
      if (!respostaAluno) {
        // Sem resposta = errou
        respostasParaCriar.push({
          tentativaId,
          questaoId: questao.id,
          correta: false,
          pontosObtidos: 0,
        })
        errosNestaTentativa.push({ questaoId: questao.id, enunciado: questao.enunciado, tipo: questao.tipo })
        continue
      }

      const rc = questao.respostaCorreta
      let correta = false

      if (rc) {
        if (questao.tipo === 'objetiva') {
          correta = !!respostaAluno.alternativaId && respostaAluno.alternativaId === rc.alternativaId
        } else if (questao.tipo === 'numerica') {
          if (respostaAluno.valorNumerico != null && rc.valorNumerico != null) {
            const tolerancia = rc.tolerancia != null ? parseFloat(rc.tolerancia.toString()) : 0
            const diff = Math.abs(respostaAluno.valorNumerico - parseFloat(rc.valorNumerico.toString()))
            correta = diff <= tolerancia
          }
        } else if (questao.tipo === 'discursiva') {
          if (respostaAluno.textoResposta && rc.textoEsperado) {
            correta = normalizar(respostaAluno.textoResposta) === normalizar(rc.textoEsperado)
          }
        }
      }

      const pontosObtidos = correta ? pontosQuestao : 0
      pontuacaoTotal += pontosObtidos

      respostasParaCriar.push({
        tentativaId,
        questaoId: questao.id,
        alternativaId: respostaAluno.alternativaId ?? null,
        valorNumerico: respostaAluno.valorNumerico != null ? respostaAluno.valorNumerico : null,
        textoResposta: respostaAluno.textoResposta ?? null,
        correta,
        pontosObtidos,
      })

      if (!correta) {
        errosNestaTentativa.push({ questaoId: questao.id, enunciado: questao.enunciado, tipo: questao.tipo })
      }
    }

    // Gravar respostas e finalizar tentativa
    await prisma.$transaction([
      prisma.respostaAluno.createMany({ data: respostasParaCriar }),
      prisma.tentativa.update({
        where: { id: tentativaId },
        data: {
          finalizadaEm: agora,
          corrigida: true,
          pontuacao: pontuacaoTotal,
          totalPontos,
        },
      }),
    ])

    // Atualizar erros recorrentes e gerar sugestões (fora da transaction para evitar locks)
    for (const erro of errosNestaTentativa) {
      const existing = await prisma.erroRecorrente.findUnique({
        where: { alunoId_questaoId: { alunoId: tentativa.alunoId, questaoId: erro.questaoId } },
      })

      if (existing) {
        const novaContagem = existing.contagem + 1
        await prisma.erroRecorrente.update({
          where: { id: existing.id },
          data: { contagem: novaContagem, ultimaOcorrencia: agora, resolvido: false },
        })

        // Gerar sugestão ao atingir limiar (e múltiplos do limiar)
        if (novaContagem % LIMIAR_ERRO_RECORRENTE === 0) {
          await prisma.sugestaoReforco.create({
            data: {
              alunoId: tentativa.alunoId,
              erroRecorrenteId: existing.id,
              texto: gerarSugestao(erro.enunciado, erro.tipo),
            },
          })
        }
      } else {
        await prisma.erroRecorrente.create({
          data: {
            alunoId: tentativa.alunoId,
            questaoId: erro.questaoId,
            contagem: 1,
            ultimaOcorrencia: agora,
          },
        })
      }
    }

    // Para questões que o aluno acertou, marcar como resolvido se havia erro recorrente
    const acertosQuestaoIds = respostasParaCriar
      .filter((r) => r.correta)
      .map((r) => r.questaoId)

    if (acertosQuestaoIds.length > 0) {
      await prisma.erroRecorrente.updateMany({
        where: {
          alunoId: tentativa.alunoId,
          questaoId: { in: acertosQuestaoIds },
        },
        data: { resolvido: true },
      })
    }

    return tentativasService.buscarPorId(tentativaId)
  },

  async errosRecorrentes(alunoId: string) {
    return prisma.erroRecorrente.findMany({
      where: { alunoId, resolvido: false },
      orderBy: [{ contagem: 'desc' }, { ultimaOcorrencia: 'desc' }],
      include: {
        questao: {
          select: {
            id: true,
            enunciado: true,
            tipo: true,
            exercicio: {
              select: { id: true, titulo: true, materia: { select: { nome: true, codigo: true } } },
            },
          },
        },
      },
    })
  },

  async sugestoes(alunoId: string) {
    return prisma.sugestaoReforco.findMany({
      where: { alunoId },
      orderBy: { criadoEm: 'desc' },
      take: 20,
      include: {
        erroRecorrente: {
          include: {
            questao: {
              select: {
                id: true,
                enunciado: true,
                tipo: true,
                exercicio: { select: { id: true, titulo: true } },
              },
            },
          },
        },
      },
    })
  },

  async marcarSugestaoVisualizada(sugestaoId: string) {
    return prisma.sugestaoReforco.update({
      where: { id: sugestaoId },
      data: { visualizada: true },
    })
  },
}
