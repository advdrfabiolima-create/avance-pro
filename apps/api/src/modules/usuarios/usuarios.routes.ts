import type { FastifyInstance } from 'fastify'
import { autenticar, apenasAdmin } from '../../shared/middlewares/auth'
import { UsuarioService } from './usuarios.service'
import {
  loginSchema,
  criarUsuarioSchema,
  atualizarUsuarioSchema,
  trocarSenhaSchema,
} from './usuarios.schema'

export async function usuariosRoutes(app: FastifyInstance): Promise<void> {
  const service = new UsuarioService((payload) => app.jwt.sign(payload))

  // POST /login — público
  app.post('/login', async (request, reply) => {
    const resultado = loginSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const { token, usuario } = await service.login(
        resultado.data.email,
        resultado.data.senha,
      )
      return reply.status(200).send({ success: true, data: { token, usuario } })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao realizar login'
      return reply.status(401).send({ success: false, error: mensagem })
    }
  })

  // POST / — autenticado, apenas franqueado
  app.post('/', { preHandler: apenasAdmin }, async (request, reply) => {
    const resultado = criarUsuarioSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const usuario = await service.criarUsuario(resultado.data)
      return reply.status(201).send({ success: true, data: usuario })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao criar usuário'
      const status = mensagem === 'E-mail já está em uso' ? 409 : 500
      return reply.status(status).send({ success: false, error: mensagem })
    }
  })

  // GET / — autenticado
  app.get('/', { preHandler: autenticar }, async (_request, reply) => {
    try {
      const usuarios = await service.listarUsuarios()
      return reply.status(200).send({ success: true, data: usuarios })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao listar usuários'
      return reply.status(500).send({ success: false, error: mensagem })
    }
  })

  // PUT /:id — autenticado, apenas franqueado
  app.put('/:id', { preHandler: apenasAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const resultado = atualizarUsuarioSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      const usuario = await service.atualizarUsuario(id, resultado.data)
      return reply.status(200).send({ success: true, data: usuario })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao atualizar usuário'
      if (mensagem === 'Usuário não encontrado') {
        return reply.status(404).send({ success: false, error: mensagem })
      }
      if (mensagem === 'E-mail já está em uso') {
        return reply.status(409).send({ success: false, error: mensagem })
      }
      return reply.status(500).send({ success: false, error: mensagem })
    }
  })

  // POST /:id/trocar-senha — autenticado (próprio usuário ou franqueado)
  app.post('/:id/trocar-senha', { preHandler: autenticar }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.user as { sub: string; perfil: string }

    const ehProprioUsuario = payload.sub === id
    const ehFranqueado = payload.perfil === 'franqueado'

    if (!ehProprioUsuario && !ehFranqueado) {
      return reply.status(403).send({
        success: false,
        error: 'Sem permissão para trocar a senha deste usuário',
      })
    }

    const resultado = trocarSenhaSchema.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({
        success: false,
        error: 'Dados inválidos',
        detalhes: resultado.error.flatten().fieldErrors,
      })
    }

    try {
      await service.trocarSenha(id, resultado.data.senhaAtual, resultado.data.novaSenha)
      return reply.status(200).send({ success: true, message: 'Senha alterada com sucesso' })
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao trocar senha'
      if (mensagem === 'Usuário não encontrado') {
        return reply.status(404).send({ success: false, error: mensagem })
      }
      if (mensagem === 'Senha atual incorreta') {
        return reply.status(400).send({ success: false, error: mensagem })
      }
      return reply.status(500).send({ success: false, error: mensagem })
    }
  })
}
