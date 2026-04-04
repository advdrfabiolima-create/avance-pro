import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarCobrancaInput, AtualizarCobrancaInput, FiltrosCobrancaInput } from './cobrancas.schema'

interface ErroNegocio { statusCode: number; message: string }
function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

const INCLUDE_COBRANCA = {
  aluno: {
    select: {
      id: true,
      nome: true,
      foto: true,
      responsaveis: {
        where: { principal: true },
        include: { responsavel: { select: { nome: true, telefone: true } } },
        take: 1,
      },
    },
  },
  pagamento: { select: { id: true, mesReferencia: true } },
} as const

export class CobrancaService {
  async criar(data: CriarCobrancaInput) {
    const aluno = await prisma.aluno.findUnique({ where: { id: data.alunoId } })
    if (!aluno) throw erroNegocio(404, 'Aluno não encontrado')

    if (data.pagamentoId) {
      const pg = await prisma.pagamento.findUnique({ where: { id: data.pagamentoId } })
      if (!pg) throw erroNegocio(404, 'Pagamento não encontrado')
    }

    return prisma.cobranca.create({
      data: {
        alunoId: data.alunoId,
        pagamentoId: data.pagamentoId ?? null,
        valor: data.valor,
        vencimento: data.vencimento,
        descricao: data.descricao,
      },
      include: INCLUDE_COBRANCA,
    })
  }

  async listar(filtros: FiltrosCobrancaInput) {
    const { alunoId, status, dataInicio, dataFim, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.CobrancaWhereInput = {
      ...(alunoId && { alunoId }),
      ...(status && { status: status as any }),
      ...((dataInicio || dataFim) && {
        vencimento: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }),
    }

    const [total, cobrancas] = await Promise.all([
      prisma.cobranca.count({ where }),
      prisma.cobranca.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { vencimento: 'desc' },
        include: INCLUDE_COBRANCA,
      }),
    ])

    return { data: cobrancas, total, page, pageSize, totalPaginas: Math.ceil(total / pageSize) }
  }

  async buscarPorId(id: string) {
    const cobranca = await prisma.cobranca.findUnique({ where: { id }, include: INCLUDE_COBRANCA })
    if (!cobranca) throw erroNegocio(404, 'Cobrança não encontrada')
    return cobranca
  }

  async atualizar(id: string, data: AtualizarCobrancaInput) {
    const existe = await prisma.cobranca.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Cobrança não encontrada')

    return prisma.cobranca.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.pagoEm !== undefined && { pagoEm: data.pagoEm }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.nossoNumero !== undefined && { nossoNumero: data.nossoNumero }),
        ...(data.linhaDigitavel !== undefined && { linhaDigitavel: data.linhaDigitavel }),
      },
      include: INCLUDE_COBRANCA,
    })
  }

  async cancelar(id: string) {
    const existe = await prisma.cobranca.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Cobrança não encontrada')
    if (existe.status === 'paga') throw erroNegocio(400, 'Não é possível cancelar uma cobrança já paga')

    return prisma.cobranca.update({
      where: { id },
      data: { status: 'cancelada' },
      include: INCLUDE_COBRANCA,
    })
  }

  // Marcar como paga
  async registrarPagamento(id: string, pagoEm: Date) {
    const existe = await prisma.cobranca.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Cobrança não encontrada')
    if (existe.status === 'cancelada') throw erroNegocio(400, 'Cobrança cancelada não pode ser paga')

    return prisma.cobranca.update({
      where: { id },
      data: { status: 'paga', pagoEm },
      include: INCLUDE_COBRANCA,
    })
  }
}

export const cobrancaService = new CobrancaService()
