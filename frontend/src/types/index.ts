export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  is_verified: boolean
  avatar_url: string | null
  google_id: string | null
  github_id: string | null
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface PersonalInfo {
  full_name?: string
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
  website?: string
  summary?: string
}

export interface ExperienceItem {
  id?: string
  company: string
  role: string
  start_date: string
  end_date?: string
  location?: string
  bullets: string[]
}

export interface EducationItem {
  id?: string
  school: string
  degree: string
  field?: string
  graduation_year: string
  gpa?: string
}

export interface SkillCategory {
  id?: string
  category: string
  skills: string[]
}

export interface ProjectItem {
  id?: string
  name: string
  description?: string
  url?: string
  technologies: string[]
}

export interface ResumeSection {
  id: number
  resume_id: number
  section_type: string
  title: string
  order_index: number
  is_visible: boolean
  content: ExperienceItem[] | EducationItem[] | SkillCategory[] | ProjectItem[] | any
  created_at: string
  updated_at: string
}

export interface Resume {
  id: number
  user_id: number
  title: string
  slug: string | null
  is_public: boolean
  personal_info: PersonalInfo
  sections: ResumeSection[]
  created_at: string
  updated_at: string
}

export interface ResumeSummary {
  id: number
  title: string
  is_public: boolean
  created_at: string
  updated_at: string
  section_count: number
}

export interface JobMatch {
  id: number
  resume_id: number
  job_title: string | null
  company_name: string | null
  match_score: number | null
  analysis: JobMatchAnalysis | null
  created_at: string
}

export interface JobMatchAnalysis {
  match_score: number
  summary: string
  matching_keywords: string[]
  missing_keywords: string[]
  strengths: string[]
  gaps: string[]
  suggestions: Array<{
    section: string
    current: string
    suggested: string
    reason: string
  }>
}

export interface ResumeAnalysis {
  overall_score: number
  summary: string
  section_scores: Record<string, number>
  strengths: string[]
  improvements: Array<{
    section: string
    issue: string
    suggestion: string
  }>
}

export type TemplateType = 'modern' | 'classic' | 'minimal'


export interface DiscoveredJob {
  id: string
  job_title: string
  company_name: string
  location: string
  source: string
  apply_url: string
  job_description: string
  match_score: number
  matching_skills: string[]
  missing_skills: string[]
}

export interface JobDiscoveryResponse {
  detected_role: string
  total_found: number
  jobs: DiscoveredJob[]
}

export interface JobApplication {
  id: number
  user_id: number
  resume_id: number | null
  job_title: string
  company_name: string
  location: string | null
  apply_url: string | null
  job_description: string | null
  match_score: number | null
  matching_skills: string[]
  missing_skills: string[]
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
  notes: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

export interface TailorResumeResponse {
  tailored_resume_id: number
  tailored_resume_title: string
  match_score: number
  matching_skills: string[]
  missing_skills: string[]
  message: string
}
