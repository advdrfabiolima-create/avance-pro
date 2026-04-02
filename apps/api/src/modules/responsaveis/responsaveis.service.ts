import { prisma, Prisma } from '@kumon-advance/db'
import type {
  CriarResponsavelInput,
  AtualizarResponsavelInput,
  FiltrosResponsavelInput,
} from './responsaveis.schema'

interface ErroNegocio {
  statusCode: number
  message: string
}

function erroNegocio(statusCode: number, message: string): ErroNegocio {
  return { statusCode, message }
}

export class ResponsavelService {
  async criar(data: CriarResponsavelInput) {
    const cpfEmUso = await prisma.responsavel.findUnique({ where: { cpf: data.cpf } })
    if (cpfEmUso) {
      throw erroNegocio(409, 'CPF já cadastrado')
    }

    try {
      const responsavel = await prisma.responsavel.create({ data })
      return responsavel
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'CPF já cadastrado')
      }
      throw err
    }
  }

  async listar(filtros: FiltrosResponsavelInput) {
    const { busca, page, pageSize } = filtros
    const skip = (page - 1) * pageSize

    const where: Prisma.ResponsavelWhereInput = busca
      ? {
          OR: [
            { nome: { contains: busca, mode: 'insensitive' } },
            { cpf: { contains: busca, mode: 'insensitive' } },
          ],
        }
      : {}

    const [responsaveis, total] = await Promise.all([
      prisma.responsavel.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nome: 'asc' },
        include: {
          alunos: {
            include: {
              aluno: { select: { id: true, nome: true } },
            },
          },
        },
      }),
      prisma.responsavel.count({ where }),
    ])

    return {
      data: responsaveis,
      total,
      page,
      pageSize,
      totalPaginas: Math.ceil(total / pageSize),
    }
  }

  async buscarPorId(id: string) {
    const responsavel = await prisma.responsavel.findUnique({
      where: { id },
      include: {
        alunos: {
          include: {
            aluno: { select: { id: true, nome: true } },
          },
        },
      },
    })

    if (!responsavel) {
      throw erroNegocio(404, 'Responsável não encontrado')
    }

    return responsavel
  }

  async atualizar(id: string, data: AtualizarResponsavelInput) {
    const existe = await prisma.responsavel.findUnique({ where: { id } })
    if (!existe) {
      throw erroNegocio(404, 'Responsável não encontrado')
    }

    if (data.cpf && data.cpf !== existe.cpf) {
      const cpfEmUso = await prisma.responsavel.findUnique({ where: { cpf: data.cpf } })
      if (cpfEmUso) {
        throw erroNegocio(409, 'CPF já cadastrado')
      }
    }

    try {
      const responsavel = await prisma.responsavel.update({
        where: { id },
        data: {
          ...(data.nome !== undefined && { nome: data.nome }),
          ...(data.cpf !== undefined && { cpf: data.cpf }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.telefone !== undefined && { telefone: data.telefone }),
          ...(data.telefoneAlt !== undefined && { telefoneAlt: data.telefoneAlt }),
        },
      })

      return responsavel
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw erroNegocio(409, 'CPF já cadastrado')
      }
      throw err
    }
  }

  async vincularAluno(
    responsavelId: string,
    alunoId: string,
    parentesco: string,
    principal: boolean,
  ) {
    const [responsavel, aluno] = await Promise.all([
      prisma.responsavel.findUnique({ where: { id: responsavelId } }),
      prisma.aluno.findUnique({ where: { id: alunoId } }),
    ])

    if (!responsavel) {
      throw erroNegocio(404, 'Responsável não encontrado')
    }
    if (!aluno) {
      throw erroNegocio(404, 'Aluno não encontrado')
    }

    await prisma.$transaction(async (tx) => {
      if (principal) {
        await tx.responsavelAluno.updateMany({
          where: { alunoId, principal: true },
          data: { principal: false },
        })
      }

      await tx.responsavelAluno.upsert({
        where: { alunoId_responsavelId: { alunoId, responsavelId } },
        create: { alunoId, responsavelId, parentesco, principal },
        update: { parentesco, principal },
      })
    })

    return prisma.responsavelAluno.findUniqueOrThrow({
      where: { alunoId_responsavelId: { alunoId, responsavelId } },
      include: {
        aluno: { select: { id: true, nome: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    })
  }

  async desvincularAluno(responsavelId: string, alunoId: string) {
    const vinculo = await prisma.responsavelAluno.findUnique({
      where: { alunoId_responsavelId: { alunoId, responsavelId } },
    })

    if (!vinculo) {
      throw erroNegocio(404, 'Vínculo entre responsável e aluno não encontrado')
    }

    const totalResponsaveis = await prisma.responsavelAluno.count({ where: { alunoId } })
    if (totalResponsaveis <= 1) {
      throw erroNegocio(
        400,
        'Não é possível desvincular o único responsável do aluno',
      )
    }

    await prisma.responsavelAluno.delete({
      where: { alunoId_responsavelId: { alunoId, responsavelId } },
    })
  }
}

export const responsavelService = new ResponsavelService()
