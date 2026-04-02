import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarNotaFiscalInput, AtualizarNotaFiscalInput, FiltrosNotaFiscalInput } from './notas-fiscais.schema'

interface ErroNegocio { statusCode: number; message: string }
function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

const INCLUDE_NF = {
  aluno: { select: { id: true, nome: true, foto: true } },
  responsavel: { select: { id: true, nome: true, cpf: true, email: true } },
} as const

export class NotaFiscalService {
  async criar(data: CriarNotaFiscalInput) {
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } })
    if (!aluno) throw erroNegocio(404, 'Aluno não encontrado')

    return prisma.notaFiscal.create({
      data: {
        alunoId: data.alunoId,
        responsavelId: data.responsavelId ?? null,
        valor: data.valor,
        competencia: data.competencia,
        descricao: data.descricao,
      },
      include: INCLUDE_NF,
    })
  }

  async listar(filtros: FiltrosNotaFiscalInput) {
    const { alunoId, status, dataInicio, dataFim, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.NotaFiscalWhereInput = {
      ...(alunoId && { alunoId }),
      ...(status && { status: status as any }),
      ...((dataInicio || dataFim) && {
        competencia: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }),
    }

    const [total, notas] = await Promise.all([
      prisma.notaFiscal.count({ where }),
      prisma.notaFiscal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { criadoEm: 'desc' },
        include: INCLUDE_NF,
      }),
    ])

    return { data: notas, total, page, pageSize, totalPaginas: Math.ceil(total / pageSize) }
  }

  async buscarPorId(id: string) {
    const nf = await prisma.notaFiscal.findUnique({ where: { id }, include: INCLUDE_NF })
    if (!nf) throw erroNegocio(404, 'Nota fiscal não encontrada')
    return nf
  }

  async atualizar(id: string, data: AtualizarNotaFiscalInput) {
    const existe = await prisma.notaFiscal.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Nota fiscal não encontrada')
    if (existe.status === 'cancelada') throw erroNegocio(400, 'Nota fiscal cancelada não pode ser alterada')

    return prisma.notaFiscal.update({
      where: { id },
      data: {
        ...(data.numero !== undefined && { numero: data.numero }),
        ...(data.status !== undefined && {
          status: data.status as any,
          ...(data.status === 'emitida' && { emitidaEm: new Date() }),
        }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.xmlUrl !== undefined && { xmlUrl: data.xmlUrl }),
      },
      include: INCLUDE_NF,
    })
  }
}

export const notaFiscalService = new NotaFiscalService()
