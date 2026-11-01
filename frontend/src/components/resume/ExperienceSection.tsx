import { useState } from 'react'
import { ResumeSection, ExperienceItem } from '../../types'
import AIImproveButton from './AIImproveButton'
import { Briefcase, Plus, Trash2, ChevronDown, ChevronUp, Save, GripVertical } from 'lucide-react'
import { nanoid } from '../../utils/nanoid'
import toast from 'react-hot-toast'

interface Props {
  section: ResumeSection
  onSave: (content: ExperienceItem[]) => Promise<void>
}

export default function ExperienceSection({ section, onSave }: Props) {
  const [items, setItems] = useState<ExperienceItem[]>((section.content as ExperienceItem[]) || [])
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: nanoid(), company: '', role: '', start_date: '', end_date: '', bullets: [''] },
    ])
  }

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const updateItem = (id: string, field: keyof ExperienceItem, value: unknown) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const addBullet = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, bullets: [...i.bullets, ''] } : i))
  }

  const updateBullet = (id: string, idx: number, val: string) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const bullets = [...i.bullets]
      bullets[idx] = val
      return { ...i, bullets }
    }))
  }

  const removeBullet = (id: string, idx: number) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      return { ...i, bullets: i.bullets.filter((_, bi) => bi !== idx) }
    }))
  }

  const handleAIResult = (result: string) => {
    try {
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed)) setItems(parsed)
    } catch {
      toast('AI returned non-JSON. Check the console.', { icon: '⚠️' })
    }
  }

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
          <Briefcase className="w-4 h-4 text-primary-500" /> {section.title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length} entries</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="card-body space-y-5">
          <div className="flex justify-between items-center">
            <AIImproveButton sectionType="experience" content={items} onResult={handleAIResult} />
            <button type="button" onClick={addItem} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Add position
            </button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No work experience yet. Click "Add position" to get started.</p>
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3 relative">
              <div className="flex items-center gap-2 absolute top-3 right-3">
                <button type="button" onClick={() => removeItem(item.id!)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Job Title *</label>
                  <input value={item.role} onChange={(e) => updateItem(item.id!, 'role', e.target.value)} className="input" placeholder="Senior Software Engineer" />
                </div>
                <div>
                  <label className="label">Company *</label>
                  <input value={item.company} onChange={(e) => updateItem(item.id!, 'company', e.target.value)} className="input" placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input value={item.start_date} onChange={(e) => updateItem(item.id!, 'start_date', e.target.value)} className="input" placeholder="Jan 2022" />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input value={item.end_date || ''} onChange={(e) => updateItem(item.id!, 'end_date', e.target.value)} className="input" placeholder="Present" />
                </div>
              </div>

              {/* Bullets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Responsibilities & Achievements</label>
                  <button type="button" onClick={() => addBullet(item.id!)} className="text-xs text-primary-600 hover:underline">
                    + Add bullet
                  </button>
                </div>
                <div className="space-y-2">
                  {item.bullets.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-gray-300"><GripVertical className="w-4 h-4" /></span>
                      <input
                        value={b}
                        onChange={(e) => updateBullet(item.id!, idx, e.target.value)}
                        className="input flex-1 text-sm"
                        placeholder="Increased deployment frequency by 40% by implementing CI/CD pipeline..."
                      />
                      <button type="button" onClick={() => removeBullet(item.id!, idx)} className="text-gray-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
