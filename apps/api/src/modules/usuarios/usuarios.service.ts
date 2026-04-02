import bcrypt from 'bcryptjs'
import { prisma } from '@kumon-advance/db'
import type { Usuario, AuthResponse } from '@kumon-advance/types'
import { env } from '../../shared/config/env'
import type { CriarUsuarioInput, AtualizarUsuarioInput } from './usuarios.schema'

type JwtSign = (payload: Record<string, unknown>) => string

export class UsuarioService {
  constructor(private readonly jwtSign: JwtSign) {}

  async login(email: string, senha: string): Promise<AuthResponse> {
    const registro = await prisma.usuario.findUnique({ where: { email } })

    if (!registro) {
      throw new Error('Credenciais inválidas')
    }

    if (!registro.ativo) {
      throw new Error('Usuário inativo')
    }

    const senhaValida = await bcrypt.compare(senha, registro.senhaHash)
    if (!senhaValida) {
      throw new Error('Credenciais inválidas')
    }

    const usuario: Usuario = {
      id: registro.id,
      nome: registro.nome,
      email: registro.email,
      perfil: registro.perfil as Usuario['perfil'],
      ativo: registro.ativo,
      criadoEm: registro.criadoEm,
    }

    const token = this.jwtSign({
      sub: registro.id,
      email: registro.email,
      perfil: registro.perfil,
    })

    return { token, usuario }
  }

  async criarUsuario(data: CriarUsuarioInput): Promise<Usuario> {
    const emailEmUso = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (emailEmUso) {
      throw new Error('E-mail já está em uso')
    }

    const senhaHash = await bcrypt.hash(data.senha, env.BCRYPT_ROUNDS)

    const registro = await prisma.usuario.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash,
        perfil: data.perfil,
      },
    })

    return {
      id: registro.id,
      nome: registro.nome,
      email: registro.email,
      perfil: registro.perfil as Usuario['perfil'],
      ativo: registro.ativo,
      criadoEm: registro.criadoEm,
    }
  }

  async listarUsuarios(): Promise<Usuario[]> {
    const registros = await prisma.usuario.findMany({
      orderBy: { nome: 'asc' },
    })

    return registros.map((r) => ({
      id: r.id,
      nome: r.nome,
      email: r.email,
      perfil: r.perfil as Usuario['perfil'],
      ativo: r.ativo,
      criadoEm: r.criadoEm,
    }))
  }

  async atualizarUsuario(id: string, data: AtualizarUsuarioInput): Promise<Usuario> {
    const existe = await prisma.usuario.findUnique({ where: { id } })
    if (!existe) {
      throw new Error('Usuário não encontrado')
    }

    if (data.email && data.email !== existe.email) {
      const emailEmUso = await prisma.usuario.findUnique({ where: { email: data.email } })
      if (emailEmUso) {
        throw new Error('E-mail já está em uso')
      }
    }

    const registro = await prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.perfil !== undefined && { perfil: data.perfil }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
      },
    })

    return {
      id: registro.id,
      nome: registro.nome,
      email: registro.email,
      perfil: registro.perfil as Usuario['perfil'],
      ativo: registro.ativo,
      criadoEm: registro.criadoEm,
    }
  }

  async trocarSenha(id: string, senhaAtual: string, novaSenha: string): Promise<void> {
    const registro = await prisma.usuario.findUnique({ where: { id } })
    if (!registro) {
      throw new Error('Usuário não encontrado')
    }

    const senhaValida = await bcrypt.compare(senhaAtual, registro.senhaHash)
    if (!senhaValida) {
      throw new Error('Senha atual incorreta')
    }

    const novoHash = await bcrypt.hash(novaSenha, env.BCRYPT_ROUNDS)

    await prisma.usuario.update({
      where: { id },
      data: { senhaHash: novoHash },
    })
  }
}
