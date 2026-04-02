import axios from 'axios'
import { useAuthStore } from '../store/auth.store'
import { api } from '../services/api'
import type { AuthResponse } from '@kumon-advance/types'

export function useAuth() {
  const usuario = useAuthStore((state) => state.usuario)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  async function loginComCredenciais(email: string, senha: string): Promise<void> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/usuarios/login', { email, senha })
    const { token, usuario } = res.data.data
    login(token, usuario)
  }

  return {
    usuario,
    isAuthenticated,
    login,
    logout,
    loginComCredenciais,
  }
}

export type LoginError = 'invalid_credentials' | 'unknown'

export function getLoginError(error: unknown): LoginError {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return 'invalid_credentials'
  }
  return 'unknown'
}
