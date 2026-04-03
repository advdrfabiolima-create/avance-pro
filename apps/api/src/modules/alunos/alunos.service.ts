import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarAlunoInput, AtualizarAlunoInput, FiltrosAlunoInput } from './alunos.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class AlunoService {
  async criar(data: CriarAlunoInput) {
    const principaisCount = data.responsaveis.filter((r) => r.principal).length
    if (principaisCount > 1) {
      throw erroNegocio(400, 'Apenas um responsável pode ser marcado como principal')
    }

    // Verifica que todos os responsáveis existem
    const ids = data.responsaveis.map((r) => r.responsavelId)
    const responsaveisExistentes = await prisma.responsavel.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    if (responsaveisExistentes.length !== ids.length) {
      throw erroNegocio(404, 'Um ou mais responsáveis informados não foram encontrados')
    }

    try {
      const aluno = await prisma.$transaction(async (tx) => {
        const novoAluno = await tx.aluno.create({
          data: {
            nome: data.nome,
            dataNascimento: data.dataNascimento,
            escola: data.escola,
            serieEscolar: data.serieEscolar,
            cadastradoKsis: data.cadastradoKsis ?? false,
          },
        })

        await tx.responsavelAluno.createMany({
          data: data.responsaveis.map((r) => ({
            alunoId: novoAluno.id,
            responsavelId: r.responsavelId,
            parentesco: r.parentesco,
            principal: r.principal,
          })),
        })

        return tx.aluno.findUniqueOrThrow({
          where: { id: novoAluno.id },
          include: {
            responsaveis: {
              include: { responsavel: true },
            },
          },
        })
      })

      return aluno
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'Conflito ao criar aluno: dado duplicado')
      }
      throw err
    }
  }

  async listar(filtros: FiltrosAlunoInput) {
    const { ativo, materiaId, turmaId, busca, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.AlunoWhereInput = {
      ...(ativo !== undefined && { ativo }),
      ...(busca && { nome: { contains: busca, mode: 'insensitive' } }),
      ...(materiaId && {
        matriculas: {
          some: { materiaId, ativo: true },
        },
      }),
      ...(turmaId && {
        turmas: {
          some: { turmaId },
        },
      }),
    }

    const [alunos, total] = await Promise.all([
      prisma.aluno.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nome: 'asc' },
        include: {
          responsaveis: {
            include: { responsavel: { select: { id: true, nome: true } } },
          },
          matriculas: {
            where: { ativo: true },
            include: {
              materia: { select: { id: true, nome: true, codigo: true } },
              nivelAtual: { select: { id: true, codigo: true, descricao: true } },
            },
          },
          sessoesAluno: {
            orderBy: { sessao: { data: 'desc' } },
            take: 6,
            select: {
              presente: true,
              acertos: true,
              erros: true,
              sessao: { select: { data: true } },
            },
          },
        },
      }),
      prisma.aluno.count({ where }),
    ])

    // Enriquecer com dados operacionais calculados
    const data = alunos.map((aluno) => {
      const ultimaSessaoAluno = aluno.sessoesAluno[0]
      const ultimaSessaoData = ultimaSessaoAluno?.sessao?.data ?? null

      const diasSemSessao = ultimaSessaoData
        ? Math.floor((Date.now() - new Date(ultimaSessaoData).getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Status operacional simples baseado em dias sem sessão
      let statusOperacional: 'avancando_bem' | 'atencao' | 'estagnado' | 'critico' | 'sem_dados'
      if (diasSemSessao === null) {
        statusOperacional = 'sem_dados'
      } else if (diasSemSessao <= 7) {
        statusOperacional = 'avancando_bem'
      } else if (diasSemSessao <= 14) {
        statusOperacional = 'atencao'
      } else if (diasSemSessao <= 30) {
        statusOperacional = 'estagnado'
      } else {
        statusOperacional = 'critico'
      }

      // Tendência: taxa de acerto das últimas 3 vs anteriores 3 sessões presentes
      const comDesempenho = aluno.sessoesAluno.filter(
        (s) => s.presente && s.acertos !== null && s.erros !== null,
      )
      let tendencia: 'subindo' | 'caindo' | 'estavel' | null = null
      if (comDesempenho.length >= 4) {
        const taxa = (s: { acertos: number | null; erros: number | null }) => {
          const total = (s.acertos ?? 0) + (s.erros ?? 0)
          return total > 0 ? (s.acertos ?? 0) / total : 0
        }
        const recentes = comDesempenho.slice(0, 3)
        const anteriores = comDesempenho.slice(3, 6)
        const mediaRec = recentes.reduce((a, s) => a + taxa(s), 0) / recentes.length
        const mediaAnt = anteriores.reduce((a, s) => a + taxa(s), 0) / anteriores.length
        const diff = mediaRec - mediaAnt
        const threshold = mediaAnt * 0.1
        if (diff > threshold) tendencia = 'subindo'
        else if (diff < -threshold) tendencia = 'caindo'
        else tendencia = 'estavel'
      }

      const matriculasAtivas = aluno.matriculas

      const { sessoesAluno, matriculas, ...rest } = aluno
      return {
        ...rest,
        matriculasAtivas,
        ultimaSessao: ultimaSessaoData,
        diasSemSessao,
        statusOperacional,
        tendencia,
      }
    })

    return {
      data,
      total,
      page,
      pageSize,
      totalPaginas: Math.ceil(total / pageSize),
    }
  }

  async buscarPorId(id: string) {
    const aluno = await prisma.aluno.findUnique({
      where: { id },
      include: {
        responsaveis: {
          include: { responsavel: true },
        },
        matriculas: {
          where: { ativo: true },
          include: {
            materia: true,
            nivelAtual: true,
          },
        },
        turmas: {
          include: { turma: true },
        },
        sessoesAluno: {
          orderBy: { sessao: { data: 'desc' } },
          take: 20,
          include: {
            sessao: { select: { data: true, turmaId: true } },
            nivel: { select: { id: true, codigo: true, descricao: true } },
            matricula: { include: { materia: { select: { id: true, nome: true, codigo: true } } } },
          },
        },
      },
    })

    if (!aluno) {
      throw erroNegocio(404, 'Aluno não encontrado')
    }

    // Calcular KPIs com base nas sessões recentes
    const sessoes = aluno.sessoesAluno
    const ultimaSessao = sessoes[0]?.sessao?.data ?? null
    const diasSemSessao = ultimaSessao
      ? Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / (1000 * 60 * 60 * 24))
      : null

    const comAcertos = sessoes.filter((s) => s.acertos !== null)
    const comErros = sessoes.filter((s) => s.erros !== null)
    const comTempo = sessoes.filter((s) => s.tempoMinutos !== null)

    const mediaAcertos = comAcertos.length > 0
      ? comAcertos.reduce((acc, s) => acc + (s.acertos ?? 0), 0) / comAcertos.length
      : null

    const mediaErros = comErros.length > 0
      ? comErros.reduce((acc, s) => acc + (s.erros ?? 0), 0) / comErros.length
      : null

    const mediaTempo = comTempo.length > 0
      ? comTempo.reduce((acc, s) => acc + (s.tempoMinutos ?? 0), 0) / comTempo.length
      : null

    const taxaAcerto =
      mediaAcertos !== null && mediaErros !== null && mediaAcertos + mediaErros > 0
        ? Math.round((mediaAcertos / (mediaAcertos + mediaErros)) * 100)
        : null

    // Status operacional baseado em dias sem sessão e taxa de acerto
    let statusOperacional: 'avancando_bem' | 'atencao' | 'estagnado' | 'critico' | 'sem_dados'
    if (diasSemSessao === null) {
      statusOperacional = 'sem_dados'
    } else if (diasSemSessao > 30) {
      statusOperacional = 'critico'
    } else if (diasSemSessao > 14) {
      statusOperacional = 'estagnado'
    } else if (taxaAcerto !== null && taxaAcerto < 60) {
      statusOperacional = 'atencao'
    } else {
      statusOperacional = 'avancando_bem'
    }

    return {
      ...aluno,
      kpis: {
        totalSessoes: sessoes.length,
        ultimaSessao,
        diasSemSessao,
        mediaAcertos,
        mediaErros,
        mediaTempo,
        taxaAcerto,
        statusOperacional,
      },
    }
  }

  async atualizar(id: string, data: AtualizarAlunoInput) {
    const existe = await prisma.aluno.findUnique({ where: { id } })
    if (!existe) {
      throw erroNegocio(404, 'Aluno não encontrado')
    }

    try {
      const aluno = await prisma.aluno.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.dataNascimento !== undefined && { dataNascimento: data.dataNascimento }),
          ...(data.escola !== undefined && { escola: data.escola }),
          ...(data.serieEscolar !== undefined && { serieEscolar: data.serieEscolar }),
          ...(data.foto !== undefined && { foto: data.foto }),
          ...(data.ativo !== undefined && { ativo: data.ativo }),
          ...(data.cadastradoKsis !== undefined && { cadastradoKsis: data.cadastradoKsis }),
          ...(data.cep !== undefined && { cep: data.cep }),
          ...(data.logradouro !== undefined && { logradouro: data.logradouro }),
          ...(data.numero !== undefined && { numero: data.numero }),
          ...(data.complemento !== undefined && { complemento: data.complemento }),
          ...(data.bairro !== undefined && { bairro: data.bairro }),
          ...(data.cidade !== undefined && { cidade: data.cidade }),
          ...(data.estado !== undefined && { estado: data.estado }),
        },
        include: {
          responsaveis: {
            include: { responsavel: true },
          },
        },
      })

      return aluno
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'Conflito ao atualizar aluno: dado duplicado')
      }
      throw err
    }
  }

  async desativar(id: string) {
    const existe = await prisma.aluno.findUnique({ where: { id } })
    if (!existe) {
      throw erroNegocio(404, 'Aluno não encontrado')
    }

    await prisma.aluno.update({
      where: { id },
      data: { ativo: false },
    })
  }
}

export const alunoService = new AlunoService()
