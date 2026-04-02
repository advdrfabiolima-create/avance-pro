import { prisma, Prisma } from '@kumon-advance/db'
import type { CriarTurmaInput, AtualizarTurmaInput } from './turmas.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class TurmaService {
  async criar(data: CriarTurmaInput) {
    try {
      const turma = await prisma.turma.create({
        data: {
          diaSemana: data.diaSemana,
          horarioInicio: data.horarioInicio,
          horarioFim: data.horarioFim,
          capacidade: data.capacidade,
        },
      })

      const totalAlunos = await prisma.turmaAluno.count({
        where: { turmaId: turma.id, dataFim: null },
      })

      return { ...turma, totalAlunos }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'Conflito de dados únicos na turma')
      }
      throw err
    }
  }

  async listar() {
    const turmas = await prisma.turma.findMany({
      orderBy: [{ diaSemana: 'asc' }, { horarioInicio: 'asc' }],
    })

    const resultado = await Promise.all(
      turmas.map(async (turma) => {
        const totalAlunos = await prisma.turmaAluno.count({
          where: { turmaId: turma.id, dataFim: null },
        })
        return { ...turma, totalAlunos }
      }),
    )

    return resultado
  }

  async buscarPorId(id: string) {
    const turma = await prisma.turma.findUnique({
      where: { id },
      include: {
        alunos: {
          where: { dataFim: null },
          include: {
            aluno: true,
          },
        },
      },
    })

    if (!turma) {
      throw erroNegocio(404, 'Turma não encontrada')
    }

    return turma
  }

  async atualizar(id: string, data: AtualizarTurmaInput) {
    const existe = await prisma.turma.findUnique({ where: { id } })
    if (!existe) {
      throw erroNegocio(404, 'Turma não encontrada')
    }

    const turma = await prisma.turma.update({
      where: { id },
      data: {
        ...(data.diaSemana !== undefined && { diaSemana: data.diaSemana }),
        ...(data.horarioInicio !== undefined && { horarioInicio: data.horarioInicio }),
        ...(data.horarioFim !== undefined && { horarioFim: data.horarioFim }),
        ...(data.capacidade !== undefined && { capacidade: data.capacidade }),
      },
    })

    return turma
  }

  async adicionarAluno(turmaId: string, alunoId: string, dataInicio: Date) {
    const turma = await prisma.turma.findUnique({ where: { id: turmaId } })
    if (!turma) {
      throw erroNegocio(404, 'Turma não encontrada')
    }

    const totalAtivos = await prisma.turmaAluno.count({
      where: { turmaId, dataFim: null },
    })

    if (totalAtivos >= turma.capacidade) {
      throw erroNegocio(422, 'Turma já atingiu a capacidade máxima')
    }

    const vinculoExistente = await prisma.turmaAluno.findFirst({
      where: { turmaId, alunoId, dataFim: null },
    })

    if (vinculoExistente) {
      throw erroNegocio(409, 'Aluno já está ativo nessa turma')
    }

    try {
      const vinculo = await prisma.turmaAluno.create({
        data: {
          turmaId,
          alunoId,
          dataInicio,
        },
      })

      return vinculo
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'Aluno já cadastrado nessa turma')
      }
      throw err
    }
  }

  async removerAluno(turmaId: string, alunoId: string) {
    const vinculo = await prisma.turmaAluno.findFirst({
      where: { turmaId, alunoId, dataFim: null },
    })

    if (!vinculo) {
      throw erroNegocio(404, 'Vínculo ativo não encontrado para esse aluno nessa turma')
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const vinculoAtualizado = await prisma.turmaAluno.update({
      where: { id: vinculo.id },
      data: { dataFim: hoje },
    })

    return vinculoAtualizado
  }
}

export const turmaService = new TurmaService()
