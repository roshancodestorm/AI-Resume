import client from './client'
import {
  JobDiscoveryResponse,
  JobApplication,
  TailorResumeResponse,
} from '../types'

export const jobsApi = {
  discover: async (resumeId: number, role?: string, location?: string): Promise<JobDiscoveryResponse> => {
    const params = new URLSearchParams({ resume_id: String(resumeId) })
    if (role) params.append('role', role)
    if (location) params.append('location', location)
    const { data } = await client.get<JobDiscoveryResponse>(`/jobs/discover?${params.toString()}`)
    return data
  },

  tailorResume: async (payload: {
    resume_id: number
    job_description: string
    job_title?: string
    company_name?: string
  }): Promise<TailorResumeResponse> => {
    const { data } = await client.post<TailorResumeResponse>('/jobs/tailor-resume', payload)
    return data
  },

  listApplications: async (): Promise<JobApplication[]> => {
    const { data } = await client.get<JobApplication[]>('/jobs/applications')
    return data
  },

  trackApplication: async (payload: {
    resume_id?: number
    job_title: string
    company_name: string
    location?: string
    apply_url?: string
    job_description?: string
    match_score?: number
    matching_skills?: string[]
    missing_skills?: string[]
    status?: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
    notes?: string
  }): Promise<JobApplication> => {
    const { data } = await client.post<JobApplication>('/jobs/applications', payload)
    return data
  },

  updateApplicationStatus: async (
    id: number,
    status?: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected',
    notes?: string
  ): Promise<JobApplication> => {
    const { data } = await client.patch<JobApplication>(`/jobs/applications/${id}`, { status, notes })
    return data
  },

  deleteApplication: async (id: number): Promise<void> => {
    await client.delete(`/jobs/applications/${id}`)
  },
}
