import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { resumesApi } from '../../api/resumes'
import { Resume, ResumeSection } from '../../types'
import PersonalInfoSection from '../../components/resume/PersonalInfoSection'
import ExperienceSection from '../../components/resume/ExperienceSection'
import EducationSection from '../../components/resume/EducationSection'
import SkillsSection from '../../components/resume/SkillsSection'
import ProjectsSection from '../../components/resume/ProjectsSection'
import ExportModal from '../../components/resume/ExportModal'
import { Download, BarChart2, ArrowLeft, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const SECTION_COMPONENTS: Record<string, React.FC<any>> = {
  experience: ExperienceSection,
  education: EducationSection,
  skills: SkillsSection,
  projects: ProjectsSection,
}

export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedRecently, setSavedRecently] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const fetchResume = useCallback(async () => {
    if (!id) return
    try {
      const data = await resumesApi.get(parseInt(id))
      setResume(data)
    } catch {
      toast.error('Resume not found')
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchResume() }, [fetchResume])

  const savePersonalInfo = async (personalInfo: object) => {
    if (!resume) return
    setSaving(true)
    try {
      const updated = await resumesApi.update(resume.id, { personal_info: personalInfo })
      setResume((prev) => prev ? { ...prev, personal_info: updated.personal_info } : prev)
      setSavedRecently(true)
      setTimeout(() => setSavedRecently(false), 2000)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveSection = async (section: ResumeSection, content: unknown) => {
    if (!resume) return
    setSaving(true)
    try {
      await resumesApi.updateSection(resume.id, section.id, { content })
      setResume((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === section.id ? { ...s, content } : s
          ),
        }
      })
      setSavedRecently(true)
      setTimeout(() => setSavedRecently(false), 2000)
    } catch {
      toast.error('Failed to save section')
    } finally {
      setSaving(false)
    }
  }

  const handleTitleChange = async (title: string) => {
    if (!resume) return
    try {
      const updated = await resumesApi.update(resume.id, { title })
      setResume((prev) => prev ? { ...prev, title: updated.title } : prev)
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!resume) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <input
              defaultValue={resume.title}
              className="text-lg font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-1 min-w-0 flex-1"
              onBlur={(e) => handleTitleChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs transition-opacity duration-300 flex items-center gap-1 ${savedRecently ? 'opacity-100 text-green-600' : 'opacity-0'}`}>
              <Check className="w-3 h-3" /> Saved
            </span>
            {saving && <span className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />}

            <Link to={`/resumes/${resume.id}/analyze`} className="btn-secondary text-sm py-1.5">
              <BarChart2 className="w-4 h-4" /> Analyze
            </Link>
            <button onClick={() => setShowExport(true)} className="btn-primary text-sm py-1.5">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Editor body */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <PersonalInfoSection
          data={resume.personal_info}
          onSave={savePersonalInfo}
        />

        {resume.sections.map((section) => {
          const Component = SECTION_COMPONENTS[section.section_type]
          if (!Component) return null
          return (
            <Component
              key={section.id}
              section={section}
              onSave={(content: unknown) => saveSection(section, content)}
            />
          )
        })}
      </div>

      {showExport && (
        <ExportModal
          resumeId={resume.id}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
