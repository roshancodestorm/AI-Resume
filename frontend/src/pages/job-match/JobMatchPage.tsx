import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { resumesApi } from '../../api/resumes'
import { aiApi } from '../../api/ai'
import { jobsApi } from '../../api/jobs'
import { ResumeSummary, JobMatch, JobMatchAnalysis } from '../../types'
import {
  Briefcase,
  CheckCircle,
  XCircle,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  Sparkles,
  BookmarkPlus,
  ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface FormValues {
  resume_id: string
  job_title: string
  company_name: string
  job_description: string
}

function ScoreBar({ score }: { score: number }) {
  const rounded = Math.round(score)
  const color = rounded >= 75 ? 'bg-emerald-500' : rounded >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  const textColor = rounded >= 75 ? 'text-emerald-700' : rounded >= 50 ? 'text-amber-700' : 'text-rose-700'

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, Math.max(5, rounded))}%` }}
        />
      </div>
      <span className={`text-xl font-extrabold ${textColor} w-14 text-right`}>{rounded}%</span>
    </div>
  )
}

function SkillChips({
  skills,
  type,
}: {
  skills: string[] | string | undefined
  type: 'matching' | 'missing'
}) {
  let list: string[] = []
  if (Array.isArray(skills)) {
    list = skills
  } else if (typeof skills === 'string') {
    list = (skills as string).split(/,\s*|\s+/).filter(Boolean)
  }

  if (list.length === 0) {
    return <span className="text-xs text-gray-400 italic">None detected</span>
  }

  const isMatching = type === 'matching'

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {list.map((skill, i) => (
        <span
          key={`${skill}-${i}`}
          className={clsx(
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm transition-all select-all',
            isMatching
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
          )}
        >
          {isMatching ? '✓ ' : '✕ '}
          {skill}
        </span>
      ))}
    </div>
  )
}

function AnalysisResult({
  analysis,
  resumeId,
  jobTitle,
  companyName,
  jobDescription,
}: {
  analysis: JobMatchAnalysis
  resumeId: number
  jobTitle: string
  companyName: string
  jobDescription: string
}) {
  const navigate = useNavigate()
  const [tailoring, setTailoring] = useState(false)
  const [tracking, setTracking] = useState(false)

  const handleTailorResume = async () => {
    setTailoring(true)
    try {
      const res = await jobsApi.tailorResume({
        resume_id: resumeId,
        job_description: jobDescription,
        job_title: jobTitle,
        company_name: companyName,
      })
      toast.success(res.message || 'Resume tailored successfully!')
      navigate(`/resumes/${res.tailored_resume_id}/edit`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to tailor resume')
    } finally {
      setTailoring(false)
    }
  }

  const handleTrackJob = async () => {
    setTracking(true)
    try {
      await jobsApi.trackApplication({
        resume_id: resumeId,
        job_title: jobTitle || 'Target Role',
        company_name: companyName || 'Company',
        job_description: jobDescription,
        match_score: analysis.match_score,
        matching_skills: analysis.matching_keywords,
        missing_skills: analysis.missing_keywords,
        status: 'saved',
      })
      toast.success('Job saved to your Application Tracker!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save job')
    } finally {
      setTracking(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Match score & quick actions */}
      <div className="card card-body shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-lg">Match Score</h3>
          <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700">
            Taxonomy Verified
          </span>
        </div>
        <ScoreBar score={analysis.match_score} />
        <p className="text-sm text-gray-700 mt-4 leading-relaxed">{analysis.summary}</p>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
          <button
            onClick={handleTailorResume}
            disabled={tailoring}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-sm"
          >
            {tailoring ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Tailoring Resume…
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tailor Resume for this Job
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={handleTrackJob}
            disabled={tracking}
            className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
          >
            <BookmarkPlus className="w-4 h-4" />
            {tracking ? 'Saving…' : 'Save to Application Tracker'}
          </button>
        </div>
      </div>

      {/* Keywords / Skills as Chips */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card card-body bg-white border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Matching Skills
            </h4>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {Array.isArray(analysis.matching_keywords) ? analysis.matching_keywords.length : 0}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Verified technical skills present in both resume and job description.</p>
          <SkillChips skills={analysis.matching_keywords} type="matching" />
        </div>

        <div className="card card-body bg-white border border-rose-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-sm text-rose-800 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" /> Missing Skills
            </h4>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {Array.isArray(analysis.missing_keywords) ? analysis.missing_keywords.length : 0}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Key technical requirements not explicitly found in candidate profile.</p>
          <SkillChips skills={analysis.missing_keywords} type="missing" />
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div className="grid sm:grid-cols-2 gap-4">
        {analysis.strengths?.length > 0 && (
          <div className="card card-body">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Core Strengths</h4>
            <ul className="space-y-2">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.gaps?.length > 0 && (
          <div className="card card-body">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Potential Gaps</h4>
            <ul className="space-y-2">
              {analysis.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {analysis.suggestions?.length > 0 && (
        <div className="card">
          <div className="card-header font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" /> Actionable Recommendations
          </div>
          <div className="card-body space-y-4">
            {analysis.suggestions.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <span className="font-semibold text-sm capitalize text-gray-800">{s.section} Section</span>
                </div>
                {s.current && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Current state:</p>
                    <p className="text-sm text-gray-600 bg-white border rounded p-2">{s.current}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-primary-700 font-medium mb-1">Recommended enhancement:</p>
                  <p className="text-sm text-gray-800 bg-primary-50/70 border border-primary-200 rounded p-2">{s.suggested}</p>
                </div>
                {s.reason && <p className="text-xs text-gray-500 mt-2">💡 {s.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function JobMatchPage() {
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [result, setResult] = useState<JobMatch | null>(null)
  const [loading, setLoading] = useState(false)
  const [submittedValues, setSubmittedValues] = useState<FormValues | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>()

  useEffect(() => {
    resumesApi.list().then(setResumes).catch(() => toast.error('Failed to load resumes'))
  }, [])

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    setResult(null)
    setSubmittedValues(data)
    try {
      const match = await aiApi.jobMatch({
        resume_id: parseInt(data.resume_id),
        job_title: data.job_title || undefined,
        company_name: data.company_name || undefined,
        job_description: data.job_description,
      })
      setResult(match)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Job match failed. Please check your inputs.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary-500" /> Job Match & Skill Analysis
        </h1>
        <p className="text-gray-500 mt-1">
          Paste a job description from LinkedIn, Naukri, or any career site to evaluate compatibility, inspect matching skills, and auto-tailor your resume truthfully.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="card card-body space-y-4 sticky top-24">
            <div>
              <label className="label">Select Resume *</label>
              <div className="relative">
                <select
                  {...register('resume_id', { required: 'Select a resume' })}
                  className={clsx('input appearance-none pr-8', errors.resume_id && 'border-red-400')}
                >
                  <option value="">Choose resume…</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {errors.resume_id && <p className="mt-1 text-xs text-red-500">{errors.resume_id.message}</p>}
            </div>

            <div>
              <label className="label">Job Title (optional)</label>
              <input {...register('job_title')} className="input" placeholder="e.g. Senior Machine Learning Engineer" />
            </div>
            <div>
              <label className="label">Company (optional)</label>
              <input {...register('company_name')} className="input" placeholder="e.g. Google, Databricks…" />
            </div>
            <div>
              <label className="label">Job Description *</label>
              <textarea
                {...register('job_description', {
                  required: 'Job description is required',
                  minLength: { value: 60, message: 'Please provide a more complete job description' },
                })}
                rows={12}
                className={clsx('input resize-none text-sm leading-relaxed', errors.job_description && 'border-red-400')}
                placeholder="Paste the full job description here (copy-pasted from LinkedIn, Naukri, Indeed, or company careers page)…"
              />
              {errors.job_description && <p className="mt-1 text-xs text-red-500">{errors.job_description.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing Skills & Match…
                </span>
              ) : 'Analyze Match & Skills'}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!result && !loading && (
            <div className="card text-center py-24 text-gray-400 border border-dashed border-gray-200">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">No analysis run yet</h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Select your resume and paste a job description on the left to see verified skills, fair match score, and auto-tailoring options.
              </p>
            </div>
          )}
          {loading && (
            <div className="card text-center py-24">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-700">Evaluating technical skills taxonomy and phrases…</p>
              <p className="text-xs text-gray-400 mt-1">Multi-word skills and exact tech requirements are being matched.</p>
            </div>
          )}
          {result && result.analysis && submittedValues && (
            <AnalysisResult
              analysis={result.analysis as JobMatchAnalysis}
              resumeId={parseInt(submittedValues.resume_id)}
              jobTitle={submittedValues.job_title}
              companyName={submittedValues.company_name}
              jobDescription={submittedValues.job_description}
            />
          )}
        </div>
      </div>
    </div>
  )
}
