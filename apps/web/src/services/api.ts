import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: adiciona Bearer token se existir no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ka_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de resposta: redireciona para /login em 401
api.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      localStorage.removeItem('ka_token')
      localStorage.removeItem('ka_usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
