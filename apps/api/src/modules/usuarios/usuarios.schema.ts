import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  senha: z.string().min(1, { message: 'Senha é obrigatória' }),
})

export const criarUsuarioSchema = z.object({
  nome: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }).max(100),
  email: z.string().email({ message: 'E-mail inválido' }).max(150),
  senha: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  perfil: z.enum(['franqueado', 'assistente'], {
    errorMap: () => ({ message: 'Perfil deve ser franqueado ou assistente' }),
  }),
})

export const atualizarUsuarioSchema = z.object({
  nome: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  perfil: z.enum(['franqueado', 'assistente']).optional(),
  ativo: z.boolean().optional(),
})

export const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, { message: 'Senha atual é obrigatória' }),
  novaSenha: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' }),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>
export type TrocarSenhaInput = z.infer<typeof trocarSenhaSchema>
