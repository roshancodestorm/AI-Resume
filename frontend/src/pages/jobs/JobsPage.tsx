import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { resumesApi } from '../../api/resumes'
import { jobsApi } from '../../api/jobs'
import { ResumeSummary, DiscoveredJob, JobApplication } from '../../types'
import {
  Compass,
  CheckCircle,
  XCircle,
  Sparkles,
  ExternalLink,
  BookmarkPlus,
  Search,
  Trash2,
  Building,
  MapPin,
  Kanban
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type TabType = 'discovery' | 'tracker'

const STATUS_COLUMNS: { id: JobApplication['status']; label: string; color: string; badgeBg: string }[] = [
  { id: 'saved', label: 'Saved', color: 'border-blue-400', badgeBg: 'bg-blue-50 text-blue-700' },
  { id: 'applied', label: 'Applied', color: 'border-amber-400', badgeBg: 'bg-amber-50 text-amber-700' },
  { id: 'interview', label: 'Interview', color: 'border-purple-400', badgeBg: 'bg-purple-50 text-purple-700' },
  { id: 'offer', label: 'Offer', color: 'border-emerald-400', badgeBg: 'bg-emerald-50 text-emerald-700' },
  { id: 'rejected', label: 'Rejected', color: 'border-gray-400', badgeBg: 'bg-gray-100 text-gray-700' },
]

export default function JobsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('discovery')
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null)

  // Discovery state
  const [roleQuery, setRoleQuery] = useState('')
  const [detectedRole, setDetectedRole] = useState('')
  const [discoveredJobs, setDiscoveredJobs] = useState<DiscoveredJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [tailoringJobId, setTailoringJobId] = useState<string | null>(null)
  const [trackingJobId, setTrackingJobId] = useState<string | null>(null)

  // Tracker state
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  // Load user resumes
  useEffect(() => {
    resumesApi.list().then((list) => {
      setResumes(list)
      if (list.length > 0 && !selectedResumeId) {
        setSelectedResumeId(list[0].id)
      }
    }).catch(() => toast.error('Failed to load resumes'))
  }, [])

  // Fetch discovered jobs whenever selected resume or query changes
  const runJobDiscovery = async (resumeId: number, query?: string) => {
    setLoadingJobs(true)
    try {
      const res = await jobsApi.discover(resumeId, query)
      setDiscoveredJobs(res.jobs)
      setDetectedRole(res.detected_role)
      if (!roleQuery) {
        setRoleQuery(res.detected_role)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to fetch job matches')
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    if (selectedResumeId && activeTab === 'discovery') {
      runJobDiscovery(selectedResumeId)
    }
  }, [selectedResumeId])

  // Load tracker applications
  const loadApplications = async () => {
    setLoadingApps(true)
    try {
      const data = await jobsApi.listApplications()
      setApplications(data)
    } catch {
      toast.error('Failed to load tracked jobs')
    } finally {
      setLoadingApps(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'tracker') {
      loadApplications()
    }
  }, [activeTab])

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedResumeId) {
      runJobDiscovery(selectedResumeId, roleQuery)
    }
  }

  // Handle Truthful Tailoring
  const handleTailorForJob = async (job: DiscoveredJob) => {
    if (!selectedResumeId) {
      toast.error('Please select a resume first')
      return
    }
    setTailoringJobId(job.id)
    try {
      const res = await jobsApi.tailorResume({
        resume_id: selectedResumeId,
        job_description: job.job_description,
        job_title: job.job_title,
        company_name: job.company_name,
      })
      toast.success(res.message || 'Resume tailored successfully!')
      // Automatically track the job application as tailored
      await jobsApi.trackApplication({
        resume_id: res.tailored_resume_id,
        job_title: job.job_title,
        company_name: job.company_name,
        location: job.location,
        apply_url: job.apply_url,
        job_description: job.job_description,
        match_score: res.match_score,
        matching_skills: res.matching_skills,
        missing_skills: res.missing_skills,
        status: 'saved',
      })
      navigate(`/resumes/${res.tailored_resume_id}/edit`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to tailor resume')
    } finally {
      setTailoringJobId(null)
    }
  }

  // Handle Quick Track Job
  const handleQuickTrack = async (job: DiscoveredJob) => {
    setTrackingJobId(job.id)
    try {
      await jobsApi.trackApplication({
        resume_id: selectedResumeId || undefined,
        job_title: job.job_title,
        company_name: job.company_name,
        location: job.location,
        apply_url: job.apply_url,
        job_description: job.job_description,
        match_score: job.match_score,
        matching_skills: job.matching_skills,
        missing_skills: job.missing_skills,
        status: 'saved',
      })
      toast.success(`Tracked: ${job.job_title} at ${job.company_name}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to track job')
    } finally {
      setTrackingJobId(null)
    }
  }

  // Handle Tracker Status Change
  const handleStatusChange = async (appId: number, newStatus: JobApplication['status']) => {
    try {
      await jobsApi.updateApplicationStatus(appId, newStatus)
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      )
      toast.success(`Status updated to ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Handle Delete Application
  const handleDeleteApplication = async (appId: number) => {
    try {
      await jobsApi.deleteApplication(appId)
      setApplications((prev) => prev.filter((a) => a.id !== appId))
      toast.success('Application removed')
    } catch {
      toast.error('Failed to delete application')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="w-7 h-7 text-primary-600" /> Job Discovery & Application Tracker
          </h1>
          <p className="text-gray-500 mt-1">
            Discover ranked jobs matched against your verified skills, auto-tailor your resume truthfully, and track your application pipeline.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('discovery')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'discovery'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Compass className="w-4 h-4" />
            Discover Jobs
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === 'tracker'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Kanban className="w-4 h-4" />
            Application Tracker
            {applications.length > 0 && (
              <span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {applications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── TAB 1: JOB DISCOVERY ─────────────────────────────────────────── */}
      {activeTab === 'discovery' && (
        <div className="space-y-6">
          {/* Controls Bar: Select Resume + Role Filter */}
          <div className="card card-body bg-white border border-gray-200 shadow-sm">
            <div className="grid md:grid-cols-12 gap-4 items-end">
              {/* Resume Selector */}
              <div className="md:col-span-4">
                <label className="label text-xs uppercase font-bold text-gray-500">
                  Targeting with Resume:
                </label>
                <select
                  value={selectedResumeId || ''}
                  onChange={(e) => setSelectedResumeId(Number(e.target.value))}
                  className="input font-medium"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Search */}
              <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
                <div className="flex-1">
                  <label className="label text-xs uppercase font-bold text-gray-500">
                    Target Role / Tech Stack:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={roleQuery}
                      onChange={(e) => setRoleQuery(e.target.value)}
                      placeholder={detectedRole || 'e.g. Machine Learning Engineer, Full-Stack…'}
                      className="input pl-9"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingJobs}
                  className="btn-primary self-end px-5 py-2.5 font-semibold text-sm shrink-0"
                >
                  {loadingJobs ? 'Searching…' : 'Search Jobs'}
                </button>
              </form>
            </div>

            {detectedRole && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-primary-600">Auto-detected Profile Role:</span>
                <span className="bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full font-medium">
                  {detectedRole}
                </span>
                <span className="text-gray-400">• Ranked using skills taxonomy & phrase matching</span>
              </div>
            )}
          </div>

          {/* Job Listings */}
          {loadingJobs ? (
            <div className="card text-center py-20">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-base font-semibold text-gray-800">Discovering best matching jobs for you…</p>
              <p className="text-xs text-gray-400 mt-1">Analyzing skills taxonomy against public and live market listings.</p>
            </div>
          ) : discoveredJobs.length === 0 ? (
            <div className="card text-center py-20 text-gray-400 border border-dashed border-gray-200">
              <Compass className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">No jobs found for this query</h3>
              <p className="text-sm text-gray-400 mt-1">Try searching for a broader role (e.g. "Software Engineer" or "Full Stack").</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>Showing {discoveredJobs.length} top ranked opportunities</span>
                <span>Sorted by Match Score (Highest first)</span>
              </div>

              {discoveredJobs.map((job) => {
                const score = job.match_score
                const scoreColor = score >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : score >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                const isTailoring = tailoringJobId === job.id
                const isTracking = trackingJobId === job.id

                return (
                  <div
                    key={job.id}
                    className="card p-6 border border-gray-200 hover:border-primary-300 transition-all hover:shadow-md bg-white"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Job Meta & Skills */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors">
                            {job.job_title}
                          </h2>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${scoreColor}`}>
                            {score}% Match
                          </span>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            {job.source}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1 font-semibold text-gray-800">
                            <Building className="w-3.5 h-3.5 text-gray-400" />
                            {job.company_name}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {job.location}
                          </span>
                        </div>

                        {/* Skills Breakdown */}
                        <div className="grid sm:grid-cols-2 gap-3 pt-2">
                          {/* Matching Skills */}
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
                            <p className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Matching Skills ({job.matching_skills.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.matching_skills.length > 0 ? (
                                job.matching_skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-xs bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium shadow-2xs"
                                  >
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">None overlapping yet</span>
                              )}
                            </div>
                          </div>

                          {/* Missing Skills */}
                          <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3">
                            <p className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Missing Skills ({job.missing_skills.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.missing_skills.length > 0 ? (
                                job.missing_skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-xs bg-white text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-medium shadow-2xs"
                                  >
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold">100% Skill Coverage!</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex lg:flex-col items-center lg:items-end justify-end gap-2.5 pt-3 lg:pt-0 shrink-0">
                        {/* Auto-Tailor Button */}
                        <button
                          onClick={() => handleTailorForJob(job)}
                          disabled={isTailoring}
                          className="btn-primary text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-sm"
                          title="Rewords your authentic background to highlight relevance for this job without fake skills"
                        >
                          {isTailoring ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Tailoring…
                            </span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Tailor Resume for this Job
                            </>
                          )}
                        </button>

                        {/* Apply on site link */}
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs font-medium px-3.5 py-2 flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Apply on Site
                        </a>

                        {/* Track Job */}
                        <button
                          onClick={() => handleQuickTrack(job)}
                          disabled={isTracking}
                          className="btn-ghost text-xs font-medium px-3 py-1.5 text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          {isTracking ? 'Tracking…' : 'Track Job'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: APPLICATION TRACKER ───────────────────────────────────── */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Application Pipeline</h2>
              <p className="text-xs text-gray-500">Track and manage the progress of every job you save or apply to.</p>
            </div>
            <button onClick={loadApplications} className="btn-secondary text-xs px-3 py-1.5">
              Refresh Tracker
            </button>
          </div>

          {loadingApps ? (
            <div className="card text-center py-20">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading your applications…</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="card text-center py-20 text-gray-400 border border-dashed border-gray-200">
              <Kanban className="w-14 h-14 mx-auto mb-3 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">No applications tracked yet</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                Use the "Discover Jobs" tab to find matched jobs and click "Track Job" or "Tailor Resume" to add them to your pipeline.
              </p>
              <button
                onClick={() => setActiveTab('discovery')}
                className="btn-primary mt-4 text-xs px-4 py-2"
              >
                Go to Job Discovery
              </button>
            </div>
          ) : (
            /* Kanban Columns */
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {STATUS_COLUMNS.map((col) => {
                const colApps = applications.filter((a) => a.status === col.id)
                return (
                  <div key={col.id} className="flex flex-col bg-gray-50/70 border border-gray-200 rounded-xl p-3 min-h-[500px]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color} bg-white`} />
                        <h3 className="text-sm font-bold text-gray-800">{col.label}</h3>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                        {colApps.length}
                      </span>
                    </div>

                    {/* Column Cards */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {colApps.map((app) => (
                        <div
                          key={app.id}
                          className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-2xs hover:shadow-sm transition-all space-y-2.5"
                        >
                          {/* Role & Company */}
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 leading-snug">{app.job_title}</h4>
                            <p className="text-xs text-gray-600 mt-0.5 font-medium">{app.company_name}</p>
                          </div>

                          {/* Score & Location */}
                          <div className="flex items-center justify-between text-2xs text-gray-500 pt-1">
                            {app.match_score ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {Math.round(app.match_score)}% Match
                              </span>
                            ) : (
                              <span className="text-gray-400">Untracked</span>
                            )}
                            {app.location && (
                              <span className="truncate max-w-[100px]" title={app.location}>
                                {app.location}
                              </span>
                            )}
                          </div>

                          {/* Status Mover */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                            <select
                              value={app.status}
                              onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                              className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50 text-gray-700 focus:outline-none focus:border-primary-400"
                            >
                              <option value="saved">Saved</option>
                              <option value="applied">Applied</option>
                              <option value="interview">Interview</option>
                              <option value="offer">Offer</option>
                              <option value="rejected">Rejected</option>
                            </select>

                            <div className="flex items-center gap-1">
                              {app.apply_url && (
                                <a
                                  href={app.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-primary-600 p-1"
                                  title="Open Job Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteApplication(app.id)}
                                className="text-gray-300 hover:text-rose-500 p-1 transition-colors"
                                title="Remove from tracker"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {colApps.length === 0 && (
                        <div className="h-28 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400">
                          Empty
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
