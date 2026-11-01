import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PersonalInfo } from '../../types'
import { User, Save, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  data: PersonalInfo
  onSave: (data: PersonalInfo) => Promise<void>
}

export default function PersonalInfoSection({ data, onSave }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit } = useForm<PersonalInfo>({ defaultValues: data })

  const onSubmit = async (values: PersonalInfo) => {
    setSaving(true)
    await onSave(values)
    setSaving(false)
  }

  return (
    <div className="card">
      <button
        type="button"
        className="card-header w-full flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <User className="w-4 h-4 text-primary-500" /> Personal Information
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full name</label>
              <input {...register('full_name')} className="input" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="label">Location</label>
              <input {...register('location')} className="input" placeholder="San Francisco, CA" />
            </div>
            <div>
              <label className="label">LinkedIn</label>
              <input {...register('linkedin')} className="input" placeholder="linkedin.com/in/janesmith" />
            </div>
            <div>
              <label className="label">GitHub</label>
              <input {...register('github')} className="input" placeholder="github.com/janesmith" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Website / Portfolio</label>
              <input {...register('website')} className="input" placeholder="janesmith.dev" />
            </div>
          </div>

          <div>
            <label className="label">Professional Summary</label>
            <textarea
              {...register('summary')}
              rows={4}
              className="input resize-none"
              placeholder="A brief overview of your experience, skills, and career goals..."
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
