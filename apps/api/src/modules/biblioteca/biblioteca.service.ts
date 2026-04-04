import { prisma, Prisma } from '@kumon-advance/db'
import type {
  CriarExercicioInput,
  AtualizarExercicioInput,
  FiltrosExercicioInput,
  GerarIaInput,
  SalvarGeradosInput,
} from './biblioteca.schema'
import { gerarExercicios } from './biblioteca.ia.service'

function erroNegocio(statusCode: number, message: string) {
  return { statusCode, message }
}

function buildWhere(filtros: FiltrosExercicioInput): Prisma.BibExercicioWhereInput {
  const where: Prisma.BibExercicioWhereInput = {}
  if (filtros.disciplina) where.disciplina = filtros.disciplina
  if (filtros.nivel) where.nivel = filtros.nivel
  if (filtros.dificuldade) where.dificuldade = filtros.dificuldade
  if (filtros.tipo) where.tipo = filtros.tipo
  if (filtros.status) where.status = filtros.status
  if (filtros.origem) where.origem = filtros.origem
  if (filtros.topico) where.topico = { contains: filtros.topico, mode: 'insensitive' }
  if (filtros.busca) {
    where.OR = [
      { enunciado: { contains: filtros.busca, mode: 'insensitive' } },
      { topico: { contains: filtros.busca, mode: 'insensitive' } },
      { subtopico: { contains: filtros.busca, mode: 'insensitive' } },
    ]
  }
  return where
}

export const bibliotecaService = {
  async listar(filtros: FiltrosExercicioInput) {
    const where = buildWhere(filtros)
    const skip = (filtros.page - 1) * filtros.pageSize
    const [total, items] = await Promise.all([
      prisma.bibExercicio.count({ where }),
      prisma.bibExercicio.findMany({
        where,
        skip,
        take: filtros.pageSize,
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true, disciplina: true, topico: true, subtopico: true,
          nivel: true, dificuldade: true, tipo: true, enunciado: true,
          tags: true, origem: true, status: true, criadoEm: true,
          _count: { select: { atividades: true } },
        },
      }),
    ])
    return {
      items,
      total,
      page: filtros.page,
      pageSize: filtros.pageSize,
      totalPaginas: Math.ceil(total / filtros.pageSize),
    }
  },

  async buscarPorId(id: string) {
    const item = await prisma.bibExercicio.findUnique({ where: { id } })
    if (!item) throw erroNegocio(404, 'Exercício não encontrado')
    return item
  },

  async criar(data: CriarExercicioInput, usuarioId?: string) {
    return prisma.bibExercicio.create({
      data: {
        disciplina: data.disciplina,
        topico: data.topico,
        subtopico: data.subtopico,
        nivel: data.nivel,
        dificuldade: data.dificuldade,
        tipo: data.tipo,
        enunciado: data.enunciado,
        opcoes: data.opcoes ?? Prisma.JsonNull,
        resposta: data.resposta,
        explicacao: data.explicacao,
        tags: data.tags,
        status: data.status ?? 'rascunho',
        origem: 'manual',
        criadoPorId: usuarioId,
      },
    })
  },

  async atualizar(id: string, data: AtualizarExercicioInput) {
    await bibliotecaService.buscarPorId(id)
    return prisma.bibExercicio.update({
      where: { id },
      data: {
        ...data,
        opcoes: data.opcoes !== undefined ? (data.opcoes ?? Prisma.JsonNull) : undefined,
        tags: data.tags,
      },
    })
  },

  async revisar(id: string, acao: 'publicar' | 'arquivar', usuarioId?: string) {
    await bibliotecaService.buscarPorId(id)
    return prisma.bibExercicio.update({
      where: { id },
      data: {
        status: acao === 'publicar' ? 'publicado' : 'arquivado',
        revisadoPorId: usuarioId,
      },
    })
  },

  async duplicar(id: string, usuarioId?: string) {
    const original = await bibliotecaService.buscarPorId(id)
    const { id: _id, criadoEm: _c, atualizadoEm: _a, revisadoPorId: _r, ...resto } = original
    return prisma.bibExercicio.create({
      data: {
        ...resto,
        enunciado: `[Cópia] ${resto.enunciado}`,
        status: 'rascunho',
        origem: 'manual',
        criadoPorId: usuarioId,
      },
    })
  },

  async arquivar(id: string) {
    await bibliotecaService.buscarPorId(id)
    return prisma.bibExercicio.update({
      where: { id },
      data: { status: 'arquivado' },
    })
  },

  async excluir(id: string) {
    await bibliotecaService.buscarPorId(id)
    await prisma.bibExercicio.delete({ where: { id } })
  },

  async gerarComIA(input: GerarIaInput) {
    return gerarExercicios(input)
  },

  async salvarGerados(data: SalvarGeradosInput, usuarioId?: string) {
    const criados = await prisma.$transaction(
      data.exercicios.map((ex) =>
        prisma.bibExercicio.create({
          data: {
            disciplina: ex.disciplina,
            topico: ex.topico,
            subtopico: ex.subtopico,
            nivel: ex.nivel,
            dificuldade: ex.dificuldade,
            tipo: ex.tipo,
            enunciado: ex.enunciado,
            opcoes: ex.opcoes ?? Prisma.JsonNull,
            resposta: ex.resposta,
            explicacao: ex.explicacao,
            tags: ex.tags,
            origem: 'ia',
            status: 'rascunho',
            criadoPorId: usuarioId,
          },
        })
      )
    )
    return criados
  },

  async metricas() {
    const [total, porStatus, porDisciplina] = await Promise.all([
      prisma.bibExercicio.count(),
      prisma.bibExercicio.groupBy({ by: ['status'], _count: true }),
      prisma.bibExercicio.groupBy({ by: ['disciplina'], _count: true }),
    ])
    return { total, porStatus, porDisciplina }
  },
}
