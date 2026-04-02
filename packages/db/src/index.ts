import { PrismaClient } from './generated'
export { Prisma } from './generated'

// Singleton do cliente Prisma — evita múltiplas conexões em dev (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}

export * from './generated'
