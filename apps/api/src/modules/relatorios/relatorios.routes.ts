import type { FastifyInstance } from 'fastify'
import { autenticar } from '../../shared/middlewares/auth'
import { prisma } from '@kumon-advance/db'

function parsePeriodo(query: Record<string, unknown>) {
  const hoje = new Date()
  const dataInicio = typeof query['dataInicio'] === 'string' && query['dataInicio']
    ? new Date(query['dataInicio'] as string)
    : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const dataFim = typeof query['dataFim'] === 'string' && query['dataFim']
    ? new Date(query['dataFim'] as string)
    : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  return { dataInicio, dataFim }
}

export async function relatoriosRoutes(app: FastifyInstance): Promise<void> {
  // Relatório de cobrança: mensalidades por status no período
  app.get('/cobranca', { preHandler: autenticar }, async (request, reply) => {
    const { dataInicio, dataFim } = parsePeriodo(request.query as Record<string, unknown>)

    try {
      const pagamentos = await prisma.pagamento.findMany({
        where: { vencimento: { gte: dataInicio, lte: dataFim } },
        include: {
          aluno: { select: { id: true, nome: true } },
          matricula: { include: { materia: { select: { id: true, nome: true } } } },
          responsavel: { select: { id: true, nome: true, telefone: true } },
        },
        orderBy: { vencimento: 'asc' },
      })

      const hoje = new Date()
      const comStatus = pagamentos.map((p) => ({
        ...p,
        status: p.pagoEm ? 'pago' : new Date(p.vencimento) < hoje ? 'vencido' : 'pendente',
      }))

      const resumo = {
        total: pagamentos.length,
        totalPagos: comStatus.filter((p) => p.status === 'pago').length,
        totalPendentes: comStatus.filter((p) => p.status === 'pendente').length,
        totalVencidos: comStatus.filter((p) => p.status === 'vencido').length,
        valorTotal: comStatus.reduce((acc, p) => acc + Number(p.valor), 0),
        valorRecebido: comStatus.filter((p) => p.status === 'pago').reduce((acc, p) => acc + Number(p.valor), 0),
        valorPendente: comStatus.filter((p) => p.status !== 'pago').reduce((acc, p) => acc + Number(p.valor), 0),
      }

      return reply.status(200).send({ success: true, data: { pagamentos: comStatus, resumo, periodo: { dataInicio, dataFim } } })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao gerar relatório de cobrança' })
    }
  })

  // Fluxo de caixa: entradas/saídas de movimentos por dia no período
  app.get('/fluxo-caixa', { preHandler: autenticar }, async (request, reply) => {
    const { dataInicio, dataFim } = parsePeriodo(request.query as Record<string, unknown>)

    try {
      const movimentos = await prisma.movimentoFinanceiro.findMany({
        where: {
          status: 'confirmado',
          data: { gte: dataInicio, lte: dataFim },
        },
        orderBy: { data: 'asc' },
      })

      // Agrupar por dia
      const porDia = new Map<string, { entradas: number; saidas: number; saldo: number }>()
      for (const m of movimentos) {
        const dia = new Date(m.data).toISOString().slice(0, 10)
        const atual = porDia.get(dia) ?? { entradas: 0, saidas: 0, saldo: 0 }
        if (m.tipo === 'entrada') {
          atual.entradas += Number(m.valor)
        } else {
          atual.saidas += Number(m.valor)
        }
        atual.saldo = atual.entradas - atual.saidas
        porDia.set(dia, atual)
      }

      const fluxo = Array.from(porDia.entries()).map(([data, valores]) => ({ data, ...valores }))
      const totalEntradas = movimentos.filter((m) => m.tipo === 'entrada').reduce((a, m) => a + Number(m.valor), 0)
      const totalSaidas = movimentos.filter((m) => m.tipo === 'saida').reduce((a, m) => a + Number(m.valor), 0)

      return reply.status(200).send({
        success: true,
        data: {
          fluxo,
          resumo: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas },
          periodo: { dataInicio, dataFim },
        },
      })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao gerar fluxo de caixa' })
    }
  })

  // Resumo financeiro consolidado por período
  app.get('/resumo', { preHandler: autenticar }, async (request, reply) => {
    const { dataInicio, dataFim } = parsePeriodo(request.query as Record<string, unknown>)

    try {
      const [pagamentos, movimentos] = await Promise.all([
        prisma.pagamento.findMany({
          where: { vencimento: { gte: dataInicio, lte: dataFim } },
          select: { valor: true, pagoEm: true, vencimento: true },
        }),
        prisma.movimentoFinanceiro.findMany({
          where: { status: 'confirmado', data: { gte: dataInicio, lte: dataFim } },
          select: { tipo: true, valor: true, origem: true },
        }),
      ])

      const hoje = new Date()
      const totalMensalidades = pagamentos.reduce((a, p) => a + Number(p.valor), 0)
      const recebido = pagamentos.filter((p) => p.pagoEm).reduce((a, p) => a + Number(p.valor), 0)
      const vencido = pagamentos.filter((p) => !p.pagoEm && new Date(p.vencimento) < hoje).reduce((a, p) => a + Number(p.valor), 0)
      const pendente = pagamentos.filter((p) => !p.pagoEm && new Date(p.vencimento) >= hoje).reduce((a, p) => a + Number(p.valor), 0)

      const entradas = movimentos.filter((m) => m.tipo === 'entrada').reduce((a, m) => a + Number(m.valor), 0)
      const saidas = movimentos.filter((m) => m.tipo === 'saida').reduce((a, m) => a + Number(m.valor), 0)

      return reply.status(200).send({
        success: true,
        data: {
          mensalidades: { total: totalMensalidades, recebido, vencido, pendente },
          movimentos: { entradas, saidas, saldo: entradas - saidas },
          periodo: { dataInicio, dataFim },
        },
      })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao gerar resumo financeiro' })
    }
  })

  // Inadimplência: alunos com pagamentos vencidos
  app.get('/inadimplencia', { preHandler: autenticar }, async (request, reply) => {
    try {
      const hoje = new Date()
      const vencidos = await prisma.pagamento.findMany({
        where: {
          pagoEm: null,
          vencimento: { lt: hoje },
        },
        include: {
          aluno: { select: { id: true, nome: true } },
          responsavel: { select: { id: true, nome: true, telefone: true, email: true } },
          matricula: { include: { materia: { select: { nome: true } } } },
        },
        orderBy: { vencimento: 'asc' },
      })

      const porAluno = new Map<string, { aluno: { id: string; nome: string }; total: number; count: number; vencimentos: string[] }>()
      for (const p of vencidos) {
        const key = p.alunoId
        const atual = porAluno.get(key) ?? { aluno: p.aluno, total: 0, count: 0, vencimentos: [] }
        atual.total += Number(p.valor)
        atual.count += 1
        atual.vencimentos.push(new Date(p.vencimento).toISOString().slice(0, 10))
        porAluno.set(key, atual)
      }

      return reply.status(200).send({
        success: true,
        data: {
          detalhes: vencidos,
          resumoPorAluno: Array.from(porAluno.values()),
          totalInadimplentes: porAluno.size,
          totalVencido: vencidos.reduce((a, p) => a + Number(p.valor), 0),
        },
      })
    } catch {
      return reply.status(500).send({ success: false, error: 'Erro ao gerar relatório de inadimplência' })
    }
  })
}
