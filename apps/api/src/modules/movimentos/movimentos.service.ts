import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarMovimentoInput, AtualizarMovimentoInput, FiltrosMovimentoInput } from './movimentos.schema'

interface ErroNegocio { statusCode: number; message: string }
function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class MovimentoService {
  async criar(data: CriarMovimentoInput) {
    if (data.pagamentoId) {
      const pg = await prisma.pagamento.findUnique({ where: { id: data.pagamentoId } })
      if (!pg) throw erroNegocio(404, 'Pagamento não encontrado')
    }

    return prisma.movimentoFinanceiro.create({
      data: {
        tipo: data.tipo as any,
        origem: data.origem as any,
        descricao: data.descricao,
        valor: data.valor,
        data: data.data,
        status: data.status as any,
        pagamentoId: data.pagamentoId ?? null,
        observacao: data.observacao,
      },
    })
  }

  async listar(filtros: FiltrosMovimentoInput) {
    const { tipo, origem, status, dataInicio, dataFim, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.MovimentoFinanceiroWhereInput = {
      ...(tipo && { tipo: tipo as any }),
      ...(origem && { origem: origem as any }),
      ...(status && { status: status as any }),
      ...((dataInicio || dataFim) && {
        data: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      }),
    }

    const [total, movimentos] = await Promise.all([
      prisma.movimentoFinanceiro.count({ where }),
      prisma.movimentoFinanceiro.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { data: 'desc' },
        include: {
          pagamento: { select: { id: true, mesReferencia: true, valor: true } },
        },
      }),
    ])

    // Totalizadores
    const totais = await prisma.movimentoFinanceiro.groupBy({
      by: ['tipo'],
      where: { ...where, status: 'confirmado' },
      _sum: { valor: true },
    })

    const totalEntradas = Number(totais.find((t) => t.tipo === 'entrada')?._sum?.valor ?? 0)
    const totalSaidas = Number(totais.find((t) => t.tipo === 'saida')?._sum?.valor ?? 0)

    return {
      data: movimentos,
      total,
      page,
      pageSize,
      totalPaginas: Math.ceil(total / pageSize),
      resumo: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas },
    }
  }

  async buscarPorId(id: string) {
    const mov = await prisma.movimentoFinanceiro.findUnique({ where: { id } })
    if (!mov) throw erroNegocio(404, 'Movimento não encontrado')
    return mov
  }

  async atualizar(id: string, data: AtualizarMovimentoInput) {
    const existe = await prisma.movimentoFinanceiro.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Movimento não encontrado')

    return prisma.movimentoFinanceiro.update({
      where: { id },
      data: {
        ...(data.tipo !== undefined && { tipo: data.tipo as any }),
        ...(data.origem !== undefined && { origem: data.origem as any }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.valor !== undefined && { valor: data.valor }),
        ...(data.data !== undefined && { data: data.data }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.observacao !== undefined && { observacao: data.observacao }),
      },
    })
  }

  async excluir(id: string) {
    const existe = await prisma.movimentoFinanceiro.findUnique({ where: { id } })
    if (!existe) throw erroNegocio(404, 'Movimento não encontrado')
    await prisma.movimentoFinanceiro.delete({ where: { id } })
  }

  async resumoPorPeriodo(dataInicio: string, dataFim: string) {
    const where: Prisma.MovimentoFinanceiroWhereInput = {
      status: 'confirmado',
      data: { gte: new Date(dataInicio), lte: new Date(dataFim) },
    }

    const [porTipo, porOrigem] = await Promise.all([
      prisma.movimentoFinanceiro.groupBy({
        by: ['tipo'],
        where,
        _sum: { valor: true },
        _count: true,
      }),
      prisma.movimentoFinanceiro.groupBy({
        by: ['origem'],
        where,
        _sum: { valor: true },
        _count: true,
      }),
    ])

    const totalEntradas = Number(porTipo.find((t) => t.tipo === 'entrada')?._sum?.valor ?? 0)
    const totalSaidas = Number(porTipo.find((t) => t.tipo === 'saida')?._sum?.valor ?? 0)

    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      porOrigem: porOrigem.map((o) => ({
        origem: o.origem,
        total: Number(o._sum?.valor ?? 0),
        count: o._count,
      })),
    }
  }
}

export const movimentoService = new MovimentoService()
