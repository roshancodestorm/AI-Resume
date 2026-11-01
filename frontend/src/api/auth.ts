import apiClient from './client'
import { AuthTokens, User } from '../types'

export const authApi = {
  register: async (email: string, password: string, full_name?: string): Promise<User> => {
    const res = await apiClient.post('/auth/register', { email, password, full_name })
    return res.data
  },

  login: async (email: string, password: string): Promise<AuthTokens> => {
    const res = await apiClient.post('/auth/login', { email, password })
    return res.data
  },

  refresh: async (refresh_token: string): Promise<AuthTokens> => {
    const res = await apiClient.post('/auth/refresh', { refresh_token })
    return res.data
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me')
    return res.data
  },

  updateMe: async (data: { full_name?: string; email?: string }): Promise<User> => {
    const res = await apiClient.put('/users/me', data)
    return res.data
  },

  googleLoginUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/google`,
  githubLoginUrl: () => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/github`,
}
