import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarSessaoInput, FiltrosSessaoInput } from './sessoes.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class SessaoService {
  async criar(data: CriarSessaoInput) {
    const sessaoExistente = await prisma.sessao.findUnique({
      where: { turmaId_data: { turmaId: data.turmaId, data: data.data } },
    })

    if (sessaoExistente) {
      throw erroNegocio(409, 'Já existe uma sessão para essa turma nessa data')
    }

    try {
      const sessao = await prisma.$transaction(async (tx) => {
        const novaSessao = await tx.sessao.create({
          data: {
            turmaId: data.turmaId,
            data: data.data,
            assistenteId: data.assistenteId,
            observacoes: data.observacoes,
            alunos: {
              create: data.alunos.map((aluno) => ({
                alunoId: aluno.alunoId,
                matriculaId: aluno.matriculaId,
                presente: aluno.presente,
                folhasFeitas: aluno.folhasFeitas ?? null,
                acertos: aluno.acertos ?? null,
                erros: aluno.erros ?? null,
                tempoMinutos: aluno.tempoMinutos ?? null,
                nivelId: aluno.nivelId ?? null,
                materialCodigo: aluno.materialCodigo ?? null,
                statusSessao: aluno.statusSessao ?? null,
                observacao: aluno.observacao ?? null,
              })),
            },
          },
          include: {
            turma: true,
            assistente: {
              select: { id: true, nome: true, email: true, perfil: true },
            },
            alunos: {
              include: {
                aluno: true,
                nivel: true,
              },
            },
          },
        })

        return novaSessao
      })

      return sessao
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'Já existe uma sessão para essa turma nessa data')
      }
      throw err
    }
  }

  async listar(filtros: FiltrosSessaoInput) {
    const { turmaId, alunoId, dataInicio, dataFim, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.SessaoWhereInput = {}

    if (turmaId) {
      where.turmaId = turmaId
    }

    if (alunoId) {
      where.alunos = { some: { alunoId } }
    }

    if (dataInicio || dataFim) {
      where.data = {}
      if (dataInicio) {
        where.data.gte = new Date(dataInicio)
      }
      if (dataFim) {
        where.data.lte = new Date(dataFim)
      }
    }

    const [total, sessoes] = await Promise.all([
      prisma.sessao.count({ where }),
      prisma.sessao.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { data: 'desc' },
        include: {
          turma: true,
          _count: {
            select: {
              alunos: { where: { presente: true } },
            },
          },
          alunos: {
            select: { presente: true, acertos: true, erros: true, tempoMinutos: true },
          },
        },
      }),
    ])

    const resultado = sessoes.map((sessao) => {
      const presentes = sessao._count.alunos
      const ausentes = sessao.alunos.length - presentes

      const comPresenca = sessao.alunos.filter((a) => a.presente)
      const comAcertos = comPresenca.filter((a) => a.acertos !== null)
      const comErros = comPresenca.filter((a) => a.erros !== null)
      const comTempo = comPresenca.filter((a) => a.tempoMinutos !== null)

      const mediaAcertos = comAcertos.length > 0
        ? Math.round(comAcertos.reduce((s, a) => s + (a.acertos ?? 0), 0) / comAcertos.length * 10) / 10
        : null
      const mediaErros = comErros.length > 0
        ? Math.round(comErros.reduce((s, a) => s + (a.erros ?? 0), 0) / comErros.length * 10) / 10
        : null
      const mediaTempo = comTempo.length > 0
        ? Math.round(comTempo.reduce((s, a) => s + (a.tempoMinutos ?? 0), 0) / comTempo.length)
        : null

      const { alunos, _count, ...restSessao } = sessao
      return { ...restSessao, presentes, ausentes, mediaAcertos, mediaErros, mediaTempo }
    })

    return {
      data: resultado,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async buscarPorId(id: string) {
    const sessao = await prisma.sessao.findUnique({
      where: { id },
      include: {
        turma: true,
        assistente: {
          select: { id: true, nome: true, email: true, perfil: true },
        },
        alunos: {
          include: {
            aluno: true,
            nivel: true,
          },
        },
      },
    })

    if (!sessao) {
      throw erroNegocio(404, 'Sessão não encontrada')
    }

    return sessao
  }

  async buscarPorAluno(alunoId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize

    const [total, registros] = await Promise.all([
      prisma.sessaoAluno.count({ where: { alunoId } }),
      prisma.sessaoAluno.findMany({
        where: { alunoId },
        skip,
        take: pageSize,
        orderBy: { sessao: { data: 'desc' } },
        include: {
          sessao: {
            include: { turma: true },
          },
          nivel: true,
          matricula: {
            include: { materia: true },
          },
        },
      }),
    ])

    return {
      data: registros,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async resumoDesempenho(alunoId: string, matriculaId: string) {
    const registros = await prisma.sessaoAluno.findMany({
      where: { alunoId, matriculaId },
      orderBy: { sessao: { data: 'desc' } },
      take: 10,
      include: {
        sessao: { select: { data: true, turmaId: true } },
        nivel: true,
      },
    })

    if (registros.length === 0) {
      return {
        totalSessoes: 0,
        mediaAcertos: null,
        mediaErros: null,
        mediaTempo: null,
        mediaFolhas: null,
        taxaAcerto: null,
        sessoes: [],
      }
    }

    const comAcertos = registros.filter((r) => r.acertos !== null)
    const comErros = registros.filter((r) => r.erros !== null)
    const comTempo = registros.filter((r) => r.tempoMinutos !== null)
    const comFolhas = registros.filter((r) => r.folhasFeitas !== null)

    const mediaAcertos =
      comAcertos.length > 0
        ? comAcertos.reduce((acc, r) => acc + (r.acertos ?? 0), 0) / comAcertos.length
        : null

    const mediaErros =
      comErros.length > 0
        ? comErros.reduce((acc, r) => acc + (r.erros ?? 0), 0) / comErros.length
        : null

    const mediaTempo =
      comTempo.length > 0
        ? comTempo.reduce((acc, r) => acc + (r.tempoMinutos ?? 0), 0) / comTempo.length
        : null

    const mediaFolhas =
      comFolhas.length > 0
        ? comFolhas.reduce((acc, r) => acc + (r.folhasFeitas ?? 0), 0) / comFolhas.length
        : null

    // Taxa de acerto: acertos / (acertos + erros), quando ambos disponíveis
    let taxaAcerto: number | null = null
    if (mediaAcertos !== null && mediaErros !== null && mediaAcertos + mediaErros > 0) {
      taxaAcerto = Math.round((mediaAcertos / (mediaAcertos + mediaErros)) * 100)
    }

    return {
      totalSessoes: registros.length,
      mediaAcertos,
      mediaErros,
      mediaTempo,
      mediaFolhas,
      taxaAcerto,
      sessoes: registros,
    }
  }
}

export const sessaoService = new SessaoService()
