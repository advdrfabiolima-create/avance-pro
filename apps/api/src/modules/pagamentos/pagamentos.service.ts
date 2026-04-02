import { prisma, Prisma } from '@kumon-advance/db'
import { notificacaoService } from '../notificacoes/notificacoes.service'
import {
  templatePagamentoConfirmado,
  templatePagamentoVencendo,
} from '../notificacoes/notificacoes.templates'
import type {
  CriarPagamentoInput,
  RegistrarPagamentoInput,
  FiltrosPagamentoInput,
} from './pagamentos.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

type StatusPagamento = 'pago' | 'vencido' | 'pendente'

type PagamentoComDatas = {
  pagoEm: Date | null
  vencimento: Date
}

export class PagamentoService {
  private calcularStatus(pagamento: PagamentoComDatas): StatusPagamento {
    if (pagamento.pagoEm !== null) return 'pago'
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    if (pagamento.vencimento < hoje) return 'vencido'
    return 'pendente'
  }

  async criar(data: CriarPagamentoInput) {
    const existente = await prisma.pagamento.findUnique({
      where: {
        matriculaId_mesReferencia: {
          matriculaId: data.matriculaId,
          mesReferencia: data.mesReferencia,
        },
      },
    })

    if (existente) {
      throw erroNegocio(
        409,
        'Já existe um pagamento para essa matrícula e mês de referência',
      )
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        alunoId: data.alunoId,
        matriculaId: data.matriculaId,
        responsavelId: data.responsavelId,
        mesReferencia: data.mesReferencia,
        valor: new Prisma.Decimal(data.valor),
        vencimento: data.vencimento,
        observacao: data.observacao,
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        matricula: { include: { materia: { select: { id: true, nome: true } } } },
        responsavel: { select: { id: true, nome: true } },
      },
    })

    return {
      ...pagamento,
      status: this.calcularStatus(pagamento),
    }
  }

  async gerarMensalidades(
    materiaId: string,
    mesReferencia: Date,
    valor: number,
    diaVencimento: number,
  ) {
    const matriculas = await prisma.matricula.findMany({
      where: { materiaId, ativo: true },
      include: {
        aluno: {
          include: {
            responsaveis: {
              where: { principal: true },
              include: { responsavel: { select: { id: true } } },
            },
          },
        },
      },
    })

    const vencimento = new Date(
      mesReferencia.getFullYear(),
      mesReferencia.getMonth(),
      diaVencimento,
    )

    const registros = matriculas
      .filter((m) => m.aluno.responsaveis.length > 0)
      .map((m) => ({
        alunoId: m.alunoId,
        matriculaId: m.id,
        responsavelId: m.aluno.responsaveis[0]!.responsavelId,
        mesReferencia,
        valor: new Prisma.Decimal(valor),
        vencimento,
      }))

    const resultado = await prisma.pagamento.createMany({
      data: registros,
      skipDuplicates: true,
    })

    return { count: resultado.count }
  }

  async listar(filtros: FiltrosPagamentoInput) {
    const { status, mes, alunoId, page, pageSize } = filtros
    const skip = (page - 1) * pageSize
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const where: Prisma.PagamentoWhereInput = {}

    if (alunoId) {
      where.alunoId = alunoId
    }

    if (mes) {
      const parts = mes.split('-').map(Number)
      const ano = parts[0]!
      const mesNum = parts[1]!
      where.mesReferencia = {
        gte: new Date(ano, mesNum - 1, 1),
        lt: new Date(ano, mesNum, 1),
      }
    }

    if (status === 'pago') {
      where.pagoEm = { not: null }
    } else if (status === 'vencido') {
      where.pagoEm = null
      where.vencimento = { lt: hoje }
    } else if (status === 'pendente') {
      where.pagoEm = null
      where.vencimento = { gte: hoje }
    }

    const [pagamentos, total] = await Promise.all([
      prisma.pagamento.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { vencimento: 'asc' },
        include: {
          aluno: { select: { id: true, nome: true } },
          matricula: { include: { materia: { select: { id: true, nome: true } } } },
          responsavel: { select: { id: true, nome: true } },
        },
      }),
      prisma.pagamento.count({ where }),
    ])

    return {
      data: pagamentos.map((p) => ({ ...p, status: this.calcularStatus(p) })),
      total,
      page,
      pageSize,
      totalPaginas: Math.ceil(total / pageSize),
    }
  }

  async buscarPorId(id: string) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        aluno: true,
        matricula: { include: { materia: true, nivelAtual: true } },
        responsavel: true,
      },
    })

    if (!pagamento) {
      throw erroNegocio(404, 'Pagamento não encontrado')
    }

    return { ...pagamento, status: this.calcularStatus(pagamento) }
  }

  async registrarPagamento(id: string, data: RegistrarPagamentoInput) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        responsavel: { select: { id: true, nome: true, email: true, telefone: true } },
        aluno: { select: { nome: true } },
      },
    })

    if (!pagamento) {
      throw erroNegocio(404, 'Pagamento não encontrado')
    }

    if (pagamento.pagoEm !== null) {
      throw erroNegocio(409, 'Este pagamento já foi registrado como pago')
    }

    const atualizado = await prisma.pagamento.update({
      where: { id },
      data: {
        pagoEm: data.pagoEm,
        formaPagamento: data.formaPagamento,
        ...(data.observacao !== undefined && { observacao: data.observacao }),
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        matricula: { include: { materia: { select: { id: true, nome: true } } } },
        responsavel: { select: { id: true, nome: true } },
      },
    })

    const mes = pagamento.mesReferencia.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })

    const template = templatePagamentoConfirmado(
      pagamento.aluno.nome,
      Number(pagamento.valor),
      mes,
    )

    notificacaoService
      .enviar(
        {
          nome: pagamento.responsavel.nome,
          email: pagamento.responsavel.email,
          telefone: pagamento.responsavel.telefone,
        },
        template.assunto,
        template.mensagem,
      )
      .catch((err: unknown) => {
        console.error('[PagamentoService] Falha ao enviar notificação de pagamento confirmado:', err)
      })

    return { ...atualizado, status: this.calcularStatus(atualizado) }
  }

  async listarInadimplentes() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        pagoEm: null,
        vencimento: { lt: hoje },
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        matricula: { include: { materia: { select: { id: true, nome: true } } } },
        responsavel: { select: { id: true, nome: true } },
      },
      orderBy: { vencimento: 'asc' },
    })

    const porAluno = new Map<
      string,
      {
        aluno: { id: string; nome: string }
        totalDevido: number
        pagamentos: typeof pagamentos
      }
    >()

    for (const p of pagamentos) {
      const entrada = porAluno.get(p.alunoId)
      if (entrada) {
        entrada.totalDevido += Number(p.valor)
        entrada.pagamentos.push(p)
      } else {
        porAluno.set(p.alunoId, {
          aluno: p.aluno,
          totalDevido: Number(p.valor),
          pagamentos: [p],
        })
      }
    }

    return Array.from(porAluno.values())
  }

  async notificarVencimentos(diasAntecedencia: number = 3) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + diasAntecedencia)

    const pagamentos = await prisma.pagamento.findMany({
      where: {
        pagoEm: null,
        vencimento: { gte: hoje, lte: limite },
      },
      include: {
        aluno: { select: { nome: true } },
        responsavel: { select: { id: true, nome: true, email: true, telefone: true } },
      },
    })

    let enviadas = 0

    for (const p of pagamentos) {
      const vencimentoFormatado = p.vencimento.toLocaleDateString('pt-BR')
      const template = templatePagamentoVencendo(
        p.aluno.nome,
        Number(p.valor),
        vencimentoFormatado,
      )

      try {
        await notificacaoService.enviar(
          {
            nome: p.responsavel.nome,
            email: p.responsavel.email,
            telefone: p.responsavel.telefone,
          },
          template.assunto,
          template.mensagem,
        )
        enviadas++
      } catch (err: unknown) {
        console.error(
          `[PagamentoService] Falha ao notificar vencimento do pagamento ${p.id}:`,
          err,
        )
      }
    }

    return { count: enviadas }
  }
}

export const pagamentoService = new PagamentoService()
