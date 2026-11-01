import apiClient from './client'
import { Resume, ResumeSummary, ResumeSection } from '../types'

export const resumesApi = {
  list: async (): Promise<ResumeSummary[]> => {
    const res = await apiClient.get('/resumes')
    return res.data
  },

  get: async (id: number): Promise<Resume> => {
    const res = await apiClient.get(`/resumes/${id}`)
    return res.data
  },

  create: async (data: { title: string; personal_info?: any }): Promise<Resume> => {
    const res = await apiClient.post('/resumes', data)
    return res.data
  },

  update: async (id: number, data: Partial<Resume>): Promise<Resume> => {
    const res = await apiClient.put(`/resumes/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/resumes/${id}`)
  },

  addSection: async (resumeId: number, data: Partial<ResumeSection>): Promise<ResumeSection> => {
    const res = await apiClient.post(`/resumes/${resumeId}/sections`, data)
    return res.data
  },

  updateSection: async (resumeId: number, sectionId: number, data: Partial<ResumeSection>): Promise<ResumeSection> => {
    const res = await apiClient.put(`/resumes/${resumeId}/sections/${sectionId}`, data)
    return res.data
  },

  deleteSection: async (resumeId: number, sectionId: number): Promise<void> => {
    await apiClient.delete(`/resumes/${resumeId}/sections/${sectionId}`)
  },

  downloadPdf: async (resumeId: number, template: string, filename?: string): Promise<void> => {
    const res = await apiClient.get(`/resumes/${resumeId}/export?template=${template}`, {
      responseType: 'blob',
    })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `resume-${template}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  exportPdf: (resumeId: number, template: string): string => {
    const token = localStorage.getItem('access_token')
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${base}/resumes/${resumeId}/export?template=${template}&token=${token}`
  },
}
