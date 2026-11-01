import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { aiApi } from '../../api/ai'
import { resumesApi } from '../../api/resumes'
import { ResumeAnalysis, ResumeSummary } from '../../types'
import { BarChart2, ArrowLeft, CheckCircle, AlertCircle, TrendingUp, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  const radius = 28
  const circ = 2 * Math.PI * radius
  const progress = (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <span className="text-xs text-gray-500 capitalize">{label}</span>
    </div>
  )
}

export default function AnalyzePage() {
  const { id } = useParams<{ id: string }>()
  const [resume, setResume] = useState<ResumeSummary | null>(null)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (id) {
      resumesApi.list().then((list) => {
        const r = list.find((x) => x.id === parseInt(id))
        if (r) setResume(r)
      })
    }
  }, [id])

  const runAnalysis = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await aiApi.analyzeResume(parseInt(id))
      setAnalysis(result)
      setFetched(true)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Analysis failed. Make sure your resume has some content.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/resumes/${id}/edit`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-500" /> Resume Analysis
          </h1>
          {resume && <p className="text-sm text-gray-500">{resume.title}</p>}
        </div>
      </div>

      {!fetched && (
        <div className="card text-center py-14">
          <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Ready to analyze your resume?</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Our AI will review your resume for ATS compatibility, clarity, impact, and completeness — and give you a detailed scorecard.
          </p>
          <button onClick={runAnalysis} disabled={loading} className="btn-primary mx-auto px-8 py-2.5">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : (
              <><Sparkles className="w-4 h-4" /> Analyze Now</>
            )}
          </button>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Overall score */}
          <div className="card card-body flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={analysis.overall_score} label="Overall Score" />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-1">Summary</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
            </div>
          </div>

          {/* Section scores */}
          {analysis.section_scores && Object.keys(analysis.section_scores).length > 0 && (
            <div className="card">
              <div className="card-header font-semibold text-gray-900">Section Scores</div>
              <div className="card-body flex flex-wrap gap-6 justify-around">
                {Object.entries(analysis.section_scores).map(([key, score]) => (
                  <ScoreRing key={key} score={score as number} label={key} />
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div className="card">
              <div className="card-header font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Strengths
              </div>
              <ul className="card-body space-y-2">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements?.length > 0 && (
            <div className="card">
              <div className="card-header font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Improvements
              </div>
              <div className="card-body space-y-4">
                {analysis.improvements.map((item, i) => (
                  <div key={i} className="border border-amber-100 bg-amber-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-sm text-gray-900 capitalize">{item.section}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{item.issue}</p>
                    <p className="text-sm text-primary-700 font-medium">💡 {item.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={runAnalysis} disabled={loading} className="btn-secondary flex-1">
              Re-analyze
            </button>
            <Link to={`/resumes/${id}/edit`} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Apply improvements
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
