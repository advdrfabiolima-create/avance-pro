import { prisma } from '@kumon-advance/db'
import type { CriarExercicioInput, AtualizarExercicioInput, CriarQuestaoInput, FiltrosExercicioInput } from './exercicios.schema'

export const exerciciosService = {
  async listar(filtros: FiltrosExercicioInput) {
    const { page, pageSize, materiaId, nivelId, ativo } = filtros
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (materiaId) where.materiaId = materiaId
    if (nivelId) where.nivelId = nivelId
    if (ativo !== undefined) where.ativo = ativo

    const [total, items] = await Promise.all([
      prisma.exercicio.count({ where }),
      prisma.exercicio.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
        include: {
          materia: { select: { id: true, nome: true, codigo: true } },
          nivel: { select: { id: true, codigo: true, descricao: true } },
          _count: { select: { questoes: true, tentativas: true } },
        },
      }),
    ])

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async buscarPorId(id: string) {
    const exercicio = await prisma.exercicio.findUnique({
      where: { id },
      include: {
        materia: { select: { id: true, nome: true, codigo: true } },
        nivel: { select: { id: true, codigo: true, descricao: true } },
        questoes: {
          orderBy: { ordem: 'asc' },
          include: {
            alternativas: { orderBy: { letra: 'asc' } },
            respostaCorreta: true,
          },
        },
        _count: { select: { tentativas: true } },
      },
    })
    if (!exercicio) throw { statusCode: 404, message: 'Exercício não encontrado' }
    return exercicio
  },

  async criar(data: CriarExercicioInput) {
    return prisma.exercicio.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao,
        materiaId: data.materiaId ?? null,
        nivelId: data.nivelId ?? null,
      },
      include: {
        materia: { select: { id: true, nome: true, codigo: true } },
        nivel: { select: { id: true, codigo: true, descricao: true } },
      },
    })
  },

  async atualizar(id: string, data: AtualizarExercicioInput) {
    await exerciciosService.buscarPorId(id)
    return prisma.exercicio.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined && { titulo: data.titulo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.materiaId !== undefined && { materiaId: data.materiaId }),
        ...(data.nivelId !== undefined && { nivelId: data.nivelId }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
      include: {
        materia: { select: { id: true, nome: true, codigo: true } },
        nivel: { select: { id: true, codigo: true, descricao: true } },
      },
    })
  },

  async excluir(id: string) {
    await exerciciosService.buscarPorId(id)
    await prisma.exercicio.delete({ where: { id } })
  },

  async adicionarQuestao(exercicioId: string, data: CriarQuestaoInput) {
    await exerciciosService.buscarPorId(exercicioId)

    const questao = await prisma.questao.create({
      data: {
        exercicioId,
        enunciado: data.enunciado,
        tipo: data.tipo,
        ordem: data.ordem,
        pontos: data.pontos,
        alternativas: data.alternativas
          ? { create: data.alternativas }
          : undefined,
      },
      include: {
        alternativas: true,
        respostaCorreta: true,
      },
    })

    // Criar respostaCorreta se fornecida
    if (data.respostaCorreta) {
      const rc = data.respostaCorreta
      await prisma.respostaCorreta.create({
        data: {
          questaoId: questao.id,
          alternativaId: rc.alternativaId ?? null,
          valorNumerico: rc.valorNumerico != null ? rc.valorNumerico : null,
          tolerancia: rc.tolerancia != null ? rc.tolerancia : null,
          textoEsperado: rc.textoEsperado ?? null,
        },
      })
    }

    return prisma.questao.findUnique({
      where: { id: questao.id },
      include: { alternativas: true, respostaCorreta: true },
    })
  },

  async removerQuestao(exercicioId: string, questaoId: string) {
    const questao = await prisma.questao.findFirst({
      where: { id: questaoId, exercicioId },
    })
    if (!questao) throw { statusCode: 404, message: 'Questão não encontrada' }
    await prisma.questao.delete({ where: { id: questaoId } })
  },

  async atualizarQuestao(exercicioId: string, questaoId: string, data: Partial<CriarQuestaoInput>) {
    const questao = await prisma.questao.findFirst({
      where: { id: questaoId, exercicioId },
    })
    if (!questao) throw { statusCode: 404, message: 'Questão não encontrada' }

    await prisma.questao.update({
      where: { id: questaoId },
      data: {
        ...(data.enunciado !== undefined && { enunciado: data.enunciado }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.ordem !== undefined && { ordem: data.ordem }),
        ...(data.pontos !== undefined && { pontos: data.pontos }),
      },
    })

    // Atualizar alternativas se fornecidas
    if (data.alternativas) {
      await prisma.alternativa.deleteMany({ where: { questaoId } })
      await prisma.alternativa.createMany({
        data: data.alternativas.map((a) => ({ ...a, questaoId })),
      })
    }

    // Atualizar resposta correta se fornecida
    if (data.respostaCorreta) {
      const rc = data.respostaCorreta
      await prisma.respostaCorreta.upsert({
        where: { questaoId },
        create: {
          questaoId,
          alternativaId: rc.alternativaId ?? null,
          valorNumerico: rc.valorNumerico != null ? rc.valorNumerico : null,
          tolerancia: rc.tolerancia != null ? rc.tolerancia : null,
          textoEsperado: rc.textoEsperado ?? null,
        },
        update: {
          alternativaId: rc.alternativaId ?? null,
          valorNumerico: rc.valorNumerico != null ? rc.valorNumerico : null,
          tolerancia: rc.tolerancia != null ? rc.tolerancia : null,
          textoEsperado: rc.textoEsperado ?? null,
        },
      })
    }

    return prisma.questao.findUnique({
      where: { id: questaoId },
      include: { alternativas: true, respostaCorreta: true },
    })
  },
}
