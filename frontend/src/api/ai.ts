import apiClient from './client'
import { ResumeAnalysis, JobMatch } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const aiApi = {
  /**
   * Stream improved content for a section. Returns an EventSource-like stream.
   * Caller receives chunks via onChunk callback.
   */
  improveSection: async (
    sectionType: string,
    content: unknown,
    context: string | undefined,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void
  ) => {
    const token = localStorage.getItem('access_token')
    const response = await fetch(`${BASE_URL}/ai/improve-section`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ section_type: sectionType, content, context }),
    })

    if (!response.ok) {
      onError(new Error(`AI request failed: ${response.statusText}`))
      return
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          const lines = text.split('\n').filter((l) => l.startsWith('data: '))
          for (const line of lines) {
            const data = line.replace('data: ', '')
            if (data === '[DONE]') {
              onDone()
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.chunk) onChunk(parsed.chunk)
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
        onDone()
      } catch (err) {
        onError(err as Error)
      }
    }

    read()
  },

  analyzeResume: async (resumeId: number): Promise<ResumeAnalysis> => {
    const res = await apiClient.post(`/ai/analyze/${resumeId}`)
    return res.data
  },

  jobMatch: async (data: {
    resume_id: number
    job_title?: string
    company_name?: string
    job_description: string
  }): Promise<JobMatch> => {
    const res = await apiClient.post('/ai/job-match', data)
    return res.data
  },

  listJobMatches: async (): Promise<JobMatch[]> => {
    const res = await apiClient.get('/ai/job-matches')
    return res.data
  },
}

export interface CoachChatRequest {
  message: string
  resume_id?: number
  conversation_history?: Array<{ role: string; content: string }>
  preferred_language?: string
}

export interface CoachChatResponse {
  reply: string
  voice_reply?: string
  suggested_roles?: string[]
  draft_section?: {
    section_type: string
    title: string
    content: any
  }
  action?: string
}

export const coachChat = async (request: CoachChatRequest): Promise<CoachChatResponse> => {
  const { data } = await apiClient.post('/ai/coach/chat', request)
  return data
}

export const applyCoachSection = async (
  resumeId: number,
  sectionType: string,
  content: any,
  title?: string
) => {
  const { data } = await apiClient.post('/ai/coach/apply-section', {
    resume_id: resumeId,
    section_type: sectionType,
    content,
    title,
  })
  return data
}

export const coachTTS = async (text: string): Promise<Blob> => {
  const { data } = await apiClient.post('/ai/coach/tts', { text }, { responseType: 'blob' })
  return data
}
