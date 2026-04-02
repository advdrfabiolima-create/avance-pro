import { create } from 'zustand'
import type { Usuario } from '@kumon-advance/types'

interface AuthState {
  token: string | null
  usuario: Usuario | null
  isAuthenticated: boolean
  login: (token: string, usuario: Usuario) => void
  logout: () => void
}

function loadFromStorage(): Pick<AuthState, 'token' | 'usuario' | 'isAuthenticated'> {
  const token = localStorage.getItem('ka_token')
  const usuarioRaw = localStorage.getItem('ka_usuario')
  const usuario: Usuario | null = usuarioRaw ? (JSON.parse(usuarioRaw) as Usuario) : null
  return {
    token,
    usuario,
    isAuthenticated: token !== null && usuario !== null,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),

  login: (token, usuario) => {
    localStorage.setItem('ka_token', token)
    localStorage.setItem('ka_usuario', JSON.stringify(usuario))
    set({ token, usuario, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('ka_token')
    localStorage.removeItem('ka_usuario')
    set({ token: null, usuario: null, isAuthenticated: false })
    window.location.href = '/login'
  },
}))
