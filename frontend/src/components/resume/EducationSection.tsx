import { useState } from 'react'
import { ResumeSection, EducationItem } from '../../types'
import AIImproveButton from './AIImproveButton'
import { GraduationCap, Plus, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { nanoid } from '../../utils/nanoid'

interface Props {
  section: ResumeSection
  onSave: (content: EducationItem[]) => Promise<void>
}

export default function EducationSection({ section, onSave }: Props) {
  const [items, setItems] = useState<EducationItem[]>((section.content as EducationItem[]) || [])
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)

  const addItem = () => setItems((p) => [...p, { id: nanoid(), school: '', degree: '', field: '', graduation_year: '', gpa: '' }])
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id))
  const update = (id: string, field: keyof EducationItem, val: string) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)))

  const handleSave = async () => {
    setSaving(true)
    await onSave(items)
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
          <GraduationCap className="w-4 h-4 text-primary-500" /> {section.title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length} entries</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="card-body space-y-4">
          <div className="flex justify-between items-center">
            <AIImproveButton sectionType="education" content={items} onResult={(r) => { try { setItems(JSON.parse(r)) } catch {} }} />
            <button type="button" onClick={addItem} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Add education
            </button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No education entries yet.</p>
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 relative">
              <button type="button" onClick={() => removeItem(item.id!)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="label">School / University *</label>
                  <input value={item.school} onChange={(e) => update(item.id!, 'school', e.target.value)} className="input" placeholder="MIT" />
                </div>
                <div>
                  <label className="label">Degree *</label>
                  <input value={item.degree} onChange={(e) => update(item.id!, 'degree', e.target.value)} className="input" placeholder="Bachelor of Science" />
                </div>
                <div>
                  <label className="label">Field of Study</label>
                  <input value={item.field || ''} onChange={(e) => update(item.id!, 'field', e.target.value)} className="input" placeholder="Computer Science" />
                </div>
                <div>
                  <label className="label">Graduation Year</label>
                  <input value={item.graduation_year} onChange={(e) => update(item.id!, 'graduation_year', e.target.value)} className="input" placeholder="2023" />
                </div>
                <div>
                  <label className="label">GPA (optional)</label>
                  <input value={item.gpa || ''} onChange={(e) => update(item.id!, 'gpa', e.target.value)} className="input" placeholder="3.8 / 4.0" />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
