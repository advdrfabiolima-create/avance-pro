import { prisma } from '@kumon-advance/db'
import type { CriarListaInput, AtualizarListaInput, FiltrosListaInput, AdicionarItemListaInput, ImportarTrilhaInput, ReordenarListaInput } from './listas.schema'

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

const exercicioSelect = {
  id: true, disciplina: true, topico: true, subtopico: true,
  nivel: true, dificuldade: true, tipo: true, enunciado: true, status: true,
}

export const listasService = {
  async listar(filtros: FiltrosListaInput) {
    const where: any = {}
    if (filtros.disciplina) where.disciplina = filtros.disciplina
    if (filtros.status) where.status = filtros.status
    if (filtros.destinatario) where.destinatario = filtros.destinatario
    if (filtros.busca) where.titulo = { contains: filtros.busca, mode: 'insensitive' }

    const skip = (filtros.page - 1) * filtros.pageSize
    const [total, items] = await Promise.all([
      prisma.listaExercicio.count({ where }),
      prisma.listaExercicio.findMany({
        where, skip, take: filtros.pageSize,
        orderBy: { criadoEm: 'desc' },
        include: { _count: { select: { itens: true } } },
      }),
    ])
    return { items, total, page: filtros.page, pageSize: filtros.pageSize, totalPaginas: Math.ceil(total / filtros.pageSize) }
  },

  async buscarPorId(id: string) {
    const lista = await prisma.listaExercicio.findUnique({
      where: { id },
      include: {
        itens: {
          orderBy: { ordemIndex: 'asc' },
          include: { exercicio: { select: exercicioSelect } },
        },
      },
    })
    if (!lista) throw erroNegocio(404, 'Lista não encontrada')
    return lista
  },

  async criar(data: CriarListaInput, usuarioId?: string) {
    return prisma.listaExercicio.create({ data: { ...data, criadoPorId: usuarioId } })
  },

  async atualizar(id: string, data: AtualizarListaInput) {
    await listasService.buscarPorId(id)
    return prisma.listaExercicio.update({ where: { id }, data })
  },

  async publicar(id: string) {
    await listasService.buscarPorId(id)
    return prisma.listaExercicio.update({ where: { id }, data: { status: 'publicado' } })
  },

  async arquivar(id: string) {
    await listasService.buscarPorId(id)
    return prisma.listaExercicio.update({ where: { id }, data: { status: 'arquivado' } })
  },

  async excluir(id: string) {
    await listasService.buscarPorId(id)
    await prisma.listaExercicio.delete({ where: { id } })
  },

  async adicionarItem(listaId: string, data: AdicionarItemListaInput) {
    await listasService.buscarPorId(listaId)
    const exercicio = await prisma.bibExercicio.findUnique({ where: { id: data.exercicioId } })
    if (!exercicio) throw erroNegocio(404, 'Exercício não encontrado')
    const existente = await prisma.listaItem.findUnique({ where: { listaId_exercicioId: { listaId, exercicioId: data.exercicioId } } })
    if (existente) throw erroNegocio(409, 'Exercício já está na lista')
    return prisma.listaItem.create({ data: { listaId, exercicioId: data.exercicioId, ordemIndex: data.ordemIndex } })
  },

  async removerItem(listaId: string, exercicioId: string) {
    const item = await prisma.listaItem.findUnique({ where: { listaId_exercicioId: { listaId, exercicioId } } })
    if (!item) throw erroNegocio(404, 'Item não encontrado na lista')
    await prisma.listaItem.delete({ where: { id: item.id } })
  },

  async importarDeTrilha(listaId: string, data: ImportarTrilhaInput) {
    await listasService.buscarPorId(listaId)
    const trilha = await prisma.trilhaPedagogica.findUnique({
      where: { id: data.trilhaId },
      include: { itens: { orderBy: { ordemIndex: 'asc' } } },
    })
    if (!trilha) throw erroNegocio(404, 'Trilha não encontrada')

    // Pega próximo ordemIndex
    const ultimo = await prisma.listaItem.findFirst({ where: { listaId }, orderBy: { ordemIndex: 'desc' } })
    let prox = (ultimo?.ordemIndex ?? -1) + 1

    const novoItens: { listaId: string; exercicioId: string; ordemIndex: number }[] = []
    for (const item of trilha.itens) {
      const existente = await prisma.listaItem.findUnique({ where: { listaId_exercicioId: { listaId, exercicioId: item.exercicioId } } })
      if (!existente) {
        novoItens.push({ listaId, exercicioId: item.exercicioId, ordemIndex: prox++ })
      }
    }

    if (novoItens.length === 0) throw erroNegocio(409, 'Todos os exercícios da trilha já estão na lista')
    await prisma.listaItem.createMany({ data: novoItens })
    return { importados: novoItens.length }
  },

  async reordenarItens(listaId: string, data: ReordenarListaInput) {
    await listasService.buscarPorId(listaId)
    await prisma.$transaction(
      data.itens.map((item) =>
        prisma.listaItem.update({ where: { id: item.id }, data: { ordemIndex: item.ordemIndex } })
      )
    )
  },
}
