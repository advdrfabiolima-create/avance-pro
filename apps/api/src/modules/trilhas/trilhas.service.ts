import { prisma } from '@kumon-advance/db'
import type { CriarTrilhaInput, AtualizarTrilhaInput, FiltrosTrilhaInput, AdicionarItemInput, ReordenarItensInput } from './trilhas.schema'

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

export const trilhasService = {
  async listar(filtros: FiltrosTrilhaInput) {
    const where: any = {}
    if (filtros.disciplina) where.disciplina = filtros.disciplina
    if (filtros.status) where.status = filtros.status
    if (filtros.busca) where.nome = { contains: filtros.busca, mode: 'insensitive' }

    const skip = (filtros.page - 1) * filtros.pageSize
    const [total, items] = await Promise.all([
      prisma.trilhaPedagogica.count({ where }),
      prisma.trilhaPedagogica.findMany({
        where, skip, take: filtros.pageSize,
        orderBy: { criadoEm: 'desc' },
        include: { _count: { select: { itens: true } } },
      }),
    ])
    return { items, total, page: filtros.page, pageSize: filtros.pageSize, totalPaginas: Math.ceil(total / filtros.pageSize) }
  },

  async buscarPorId(id: string) {
    const trilha = await prisma.trilhaPedagogica.findUnique({
      where: { id },
      include: {
        itens: {
          orderBy: { ordemIndex: 'asc' },
          include: {
            exercicio: {
              select: { id: true, disciplina: true, topico: true, subtopico: true, nivel: true, dificuldade: true, tipo: true, enunciado: true, status: true },
            },
          },
        },
      },
    })
    if (!trilha) throw erroNegocio(404, 'Trilha não encontrada')
    return trilha
  },

  async criar(data: CriarTrilhaInput) {
    return prisma.trilhaPedagogica.create({
      data: {
        nome: data.nome,
        disciplina: data.disciplina,
        descricao: data.descricao,
        nivelInicio: data.nivelInicio,
        nivelFim: data.nivelFim,
        status: data.status ?? 'rascunho',
      },
    })
  },

  async atualizar(id: string, data: AtualizarTrilhaInput) {
    await trilhasService.buscarPorId(id)
    return prisma.trilhaPedagogica.update({ where: { id }, data })
  },

  async excluir(id: string) {
    await trilhasService.buscarPorId(id)
    await prisma.trilhaPedagogica.delete({ where: { id } })
  },

  async adicionarItem(trilhaId: string, data: AdicionarItemInput) {
    await trilhasService.buscarPorId(trilhaId)
    const exercicio = await prisma.bibExercicio.findUnique({ where: { id: data.exercicioId } })
    if (!exercicio) throw erroNegocio(404, 'Exercício não encontrado')
    const existente = await prisma.trilhaItem.findUnique({ where: { trilhaId_exercicioId: { trilhaId, exercicioId: data.exercicioId } } })
    if (existente) throw erroNegocio(409, 'Exercício já está na trilha')
    return prisma.trilhaItem.create({ data: { trilhaId, exercicioId: data.exercicioId, ordemIndex: data.ordemIndex } })
  },

  async removerItem(trilhaId: string, exercicioId: string) {
    const item = await prisma.trilhaItem.findUnique({ where: { trilhaId_exercicioId: { trilhaId, exercicioId } } })
    if (!item) throw erroNegocio(404, 'Item não encontrado na trilha')
    await prisma.trilhaItem.delete({ where: { id: item.id } })
  },

  async reordenarItens(trilhaId: string, data: ReordenarItensInput) {
    await trilhasService.buscarPorId(trilhaId)
    await prisma.$transaction(
      data.itens.map((item) =>
        prisma.trilhaItem.update({ where: { id: item.id }, data: { ordemIndex: item.ordemIndex } })
      )
    )
  },
}
