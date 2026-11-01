import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resumesApi } from '../../api/resumes'
import { aiApi } from '../../api/ai'
import { ResumeSummary, JobMatch } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { FileText, Plus, Trash2, Edit, BarChart2, Briefcase, Clock, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([resumesApi.list(), aiApi.listJobMatches()])
      .then(([r, jm]) => {
        setResumes(r)
        setJobMatches(jm)
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resume? This cannot be undone.')) return
    try {
      await resumesApi.delete(id)
      setResumes((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resume deleted')
    } catch {
      toast.error('Failed to delete resume')
    }
  }

  const handleCreate = async () => {
    try {
      const r = await resumesApi.create({ title: 'Untitled Resume' })
      navigate(`/resumes/${r.id}/edit`)
    } catch {
      toast.error('Failed to create resume')
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-gray-500 mt-1">Manage your resumes and track job matches.</p>
        </div>
        <button onClick={handleCreate} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Resume
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Resumes', value: resumes.length, icon: FileText, color: 'text-primary-600 bg-primary-50' },
          { label: 'Job Matches', value: jobMatches.length, icon: Briefcase, color: 'text-emerald-600 bg-emerald-50' },
          {
            label: 'Avg Match Score',
            value: jobMatches.length ? `${Math.round(jobMatches.reduce((s, j) => s + (j.match_score || 0), 0) / jobMatches.length)}%` : '–',
            icon: BarChart2,
            color: 'text-violet-600 bg-violet-50',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4 px-5 py-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resumes */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-primary-500" /> Your Resumes</h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32 animate-pulse bg-gray-50" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="card text-center py-14">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No resumes yet. Create your first one!</p>
            <button onClick={handleCreate} className="btn-primary mx-auto">
              <Plus className="w-4 h-4" /> Create resume
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((resume) => (
              <div key={resume.id} className="card group hover:shadow-md transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{resume.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(resume.updated_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{resume.section_count} sections</p>
                    </div>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors ml-2 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link to={`/resumes/${resume.id}/edit`} className="btn-primary flex-1 text-xs py-1.5">
                      <Edit className="w-3 h-3" /> Edit
                    </Link>
                    <Link to={`/resumes/${resume.id}/analyze`} className="btn-secondary flex-1 text-xs py-1.5">
                      <BarChart2 className="w-3 h-3" /> Analyze
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Job Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-500" /> Recent Job Matches
          </h2>
          <Link to="/job-match" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            New match <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {jobMatches.length === 0 ? (
          <div className="card text-center py-10">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No job matches yet.</p>
            <Link to="/job-match" className="btn-primary mx-auto text-sm">Start matching</Link>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {jobMatches.slice(0, 5).map((match) => (
              <div key={match.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {match.job_title || 'Untitled role'}{match.company_name ? ` @ ${match.company_name}` : ''}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(match.created_at).toLocaleDateString()}</p>
                </div>
                {match.match_score != null && <ScoreBadge score={Math.round(match.match_score)} />}
                <Link to={`/job-match/${match.id}`} className="text-gray-400 hover:text-primary-600">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
