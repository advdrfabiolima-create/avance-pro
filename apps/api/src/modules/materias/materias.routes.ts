import type { FastifyInstance } from 'fastify'
import { prisma } from '@kumon-advance/db'
import { autenticar } from '../../shared/middlewares/auth'

export async function materiasRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/materias — lista todas as matérias com seus níveis
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    const materias = await prisma.materia.findMany({
      include: {
        niveis: { orderBy: { ordem: 'asc' } },
      },
      orderBy: { codigo: 'asc' },
    })
    return reply.status(200).send({ success: true, data: materias })
  })
}
