import type { FastifyInstance } from 'fastify'
import { prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'

export async function materiasRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/materias — lista todas as matérias com seus níveis
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    const [materias, contagens] = await Promise.all([
      prisma.materia.findMany({
        include: { niveis: { orderBy: { ordem: 'asc' } } },
        orderBy: { codigo: 'asc' },
      }),
      prisma.matricula.groupBy({
        by: ['materiaId'],
        where: { ativo: true },
        _count: { alunoId: true },
      }),
    ])

    const contagemMap = new Map(contagens.map((c) => [c.materiaId, c._count.alunoId]))

    const data = materias.map((m) => ({
      ...m,
      alunosAtivos: contagemMap.get(m.id) ?? 0,
    }))

    return reply.status(200).send({ success: true, data })
  })
}
