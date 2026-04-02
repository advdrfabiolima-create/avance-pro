import type { FastifyRequest, FastifyReply } from 'fastify'

export async function autenticar(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ success: false, error: 'Não autorizado' })
  }
}

export async function apenasAdmin(request: FastifyRequest, reply: FastifyReply) {
  await autenticar(request, reply)
  const payload = request.user as { perfil: string }
  if (payload.perfil !== 'franqueado') {
    reply.status(403).send({ success: false, error: 'Acesso restrito ao franqueado' })
  }
}
