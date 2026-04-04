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
        include: { responsavel: { select: { nome: true, telefone: true, email: true } } },
        take: 1,
      },
    },
  },
  pagamento: { select: { id: true, mesReferencia: true } },
} as const

const INCLUDE_INADIMPLENCIA = {
  aluno: {
    select: {
      id: true,
      nome: true,
      foto: true,
      responsaveis: {
        where: { principal: true },
        include: { responsavel: { select: { nome: true, telefone: true, email: true } } },
        take: 1,
      },
    },
  },
  pagamento: { select: { id: true, mesReferencia: true } },
  actionLogs: {
    orderBy: { triggeredAt: 'desc' as const },
    take: 1,
    select: { actionType: true, triggeredAt: true, channel: true, status: true },
  },
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

  // ── Inadimplência ─────────────────────────────────────────────────────────────

  async resumoInadimplencia() {
    const hoje = new Date()

    // Cobranças vencidas e não pagas/canceladas
    const base: Prisma.CobrancaWhereInput = {
      status: { in: ['aguardando', 'enviada', 'vencida'] },
      vencimento: { lt: hoje },
    }

    const [total, valorAgg, faixas] = await Promise.all([
      prisma.cobranca.count({ where: base }),
      prisma.cobranca.aggregate({ where: base, _sum: { valor: true } }),
      Promise.all(
        [
          { label: '1-30', min: 1, max: 30 },
          { label: '31-90', min: 31, max: 90 },
          { label: '91-180', min: 91, max: 180 },
          { label: '181-364', min: 181, max: 364 },
          { label: '365+', min: 365, max: null },
        ].map(async ({ label, min, max }) => {
          const w: Prisma.CobrancaWhereInput = {
            ...base,
            vencimento: {
              lt: new Date(hoje.getTime() - (min - 1) * 86400000),
              ...(max ? { gte: new Date(hoje.getTime() - max * 86400000) } : {}),
            },
          }
          const [count, agg] = await Promise.all([
            prisma.cobranca.count({ where: w }),
            prisma.cobranca.aggregate({ where: w, _sum: { valor: true } }),
          ])
          return { label, count, valor: Number(agg._sum.valor ?? 0) }
        }),
      ),
    ])

    // Alunos distintos inadimplentes
    const alunos = await prisma.cobranca.groupBy({
      by: ['alunoId'],
      where: base,
    })

    return {
      totalCobrancas: total,
      totalAlunos: alunos.length,
      valorTotal: Number(valorAgg._sum.valor ?? 0),
      faixas,
    }
  }

  async listarInadimplencia(filtros: {
    faixa?: string
    alunoId?: string
    page?: number
    pageSize?: number
  }) {
    const hoje = new Date()
    const { faixa, alunoId, page = 1, pageSize = 20 } = filtros
    const skip = (page - 1) * pageSize

    let vencimentoFilter: Prisma.CobrancaWhereInput['vencimento'] = { lt: hoje }

    if (faixa) {
      const faixaMap: Record<string, { min: number; max: number | null }> = {
        '1-30':    { min: 1, max: 30 },
        '31-90':   { min: 31, max: 90 },
        '91-180':  { min: 91, max: 180 },
        '181-364': { min: 181, max: 364 },
        '365+':    { min: 365, max: null },
      }
      const f = faixaMap[faixa]
      if (f) {
        vencimentoFilter = {
          lt: new Date(hoje.getTime() - (f.min - 1) * 86400000),
          ...(f.max ? { gte: new Date(hoje.getTime() - f.max * 86400000) } : {}),
        }
      }
    }

    const where: Prisma.CobrancaWhereInput = {
      status: { in: ['aguardando', 'enviada', 'vencida'] },
      vencimento: vencimentoFilter,
      ...(alunoId && { alunoId }),
    }

    const [total, cobrancas] = await Promise.all([
      prisma.cobranca.count({ where }),
      prisma.cobranca.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { vencimento: 'asc' },
        include: INCLUDE_INADIMPLENCIA,
      }),
    ])

    const data = cobrancas.map((c) => ({
      ...c,
      diasAtraso: Math.floor((hoje.getTime() - new Date(c.vencimento).getTime()) / 86400000),
    }))

    return { data, total, page, pageSize, totalPaginas: Math.ceil(total / pageSize) }
  }
}

export const cobrancaService = new CobrancaService()
