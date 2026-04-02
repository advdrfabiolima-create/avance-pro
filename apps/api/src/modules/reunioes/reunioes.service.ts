import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarReuniaoInput, AtualizarReuniaoInput, FiltrosReuniaoInput } from './reunioes.schema'

interface ErroNegocio { statusCode: number; message: string }
function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

const INCLUDE_REUNIAO = {
  aluno: { select: { id: true, nome: true, foto: true } },
  responsavel: { select: { id: true, nome: true, telefone: true } },
  usuario: { select: { id: true, nome: true, perfil: true } },
} as const

export class ReuniaoService {
  async criar(data: CriarReuniaoInput) {
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } })
    if (!aluno) throw erroNegocio(404, 'Aluno não encontrado')

    if (data.responsavelId) {
      const resp = await prisma.responsavel.findUnique({ where: { id: data.responsavelId } })
      if (!resp) throw erroNegocio(404, 'Responsável não encontrado')
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: data.usuarioId } })
    if (!usuario) throw erroNegocio(404, 'Usuário não encontrado')

    return prisma.reuniao.create({
      data: {
        alunoId: data.alunoId,
        responsavelId: data.responsavelId ?? null,
        usuarioId: data.usuarioId,
        data: data.data,
        descricao: data.descricao,
        tipo: data.tipo,
      },
      include: INCLUDE_REUNIAO,
    })
  }

  async listar(filtros: FiltrosReuniaoInput) {
    const { alunoId, usuarioId, tipo, dataInicio, dataFim, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.ReuniaoWhereInput = {
      ...(alunoId && { alunoId }),
      ...(usuarioId && { usuarioId }),
      ...(tipo && { tipo }),
      ...((dataInicio || dataFim) && {
        data: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }),
    }

    const [total, reunioes] = await Promise.all([
      prisma.reuniao.count({ where }),
      prisma.reuniao.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { data: 'desc' },
        include: INCLUDE_REUNIAO,
      }),
    ])

    return { data: reunioes, total, page, pageSize, totalPaginas: Math.ceil(total / pageSize) }
  }

  async buscarPorId(id: string) {
    const reuniao = await prisma.reuniao.findUnique({
      where: { id },
      include: INCLUDE_REUNIAO,
    })
    if (!reuniao) throw erroNegocio(404, 'Reunião não encontrada')
    return reuniao
  }

  async atualizar(id: string, data: AtualizarReuniaoInput) {
    const existe = await prisma.reuniao.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Reunião não encontrada')

    return prisma.reuniao.update({
      where: { id },
      data: {
        ...(data.data !== undefined && { data: data.data }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.responsavelId !== undefined && { responsavelId: data.responsavelId }),
      },
      include: INCLUDE_REUNIAO,
    })
  }

  async excluir(id: string) {
    const existe = await prisma.reuniao.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Reunião não encontrada')
    await prisma.reuniao.delete({ where: { id } })
  }
}

export const reuniaoService = new ReuniaoService()
