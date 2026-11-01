import { useState } from 'react'
import { ResumeSection, SkillCategory } from '../../types'
import AIImproveButton from './AIImproveButton'
import { Zap, Plus, Trash2, X, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { nanoid } from '../../utils/nanoid'

interface Props {
  section: ResumeSection
  onSave: (content: SkillCategory[]) => Promise<void>
}

export default function SkillsSection({ section, onSave }: Props) {
  const [categories, setCategories] = useState<SkillCategory[]>((section.content as SkillCategory[]) || [])
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSkillInput, setNewSkillInput] = useState<Record<string, string>>({})

  const addCategory = () =>
    setCategories((p) => [...p, { id: nanoid(), category: '', skills: [] }])

  const removeCategory = (id: string) => setCategories((p) => p.filter((c) => c.id !== id))

  const updateCategory = (id: string, val: string) =>
    setCategories((p) => p.map((c) => (c.id === id ? { ...c, category: val } : c)))

  const addSkill = (id: string) => {
    const skill = newSkillInput[id]?.trim()
    if (!skill) return
    setCategories((p) => p.map((c) => c.id === id ? { ...c, skills: [...c.skills, skill] } : c))
    setNewSkillInput((p) => ({ ...p, [id]: '' }))
  }

  const removeSkill = (catId: string, skillIdx: number) =>
    setCategories((p) => p.map((c) => c.id === catId ? { ...c, skills: c.skills.filter((_, i) => i !== skillIdx) } : c))

  const handleSave = async () => {
    setSaving(true)
    await onSave(categories)
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
          <Zap className="w-4 h-4 text-primary-500" /> {section.title}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="card-body space-y-4">
          <div className="flex justify-between items-center">
            <AIImproveButton sectionType="skills" content={categories} onResult={(r) => { try { setCategories(JSON.parse(r)) } catch {} }} />
            <button type="button" onClick={addCategory} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Add category
            </button>
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <Zap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No skills yet. Add a category like "Languages" or "Frameworks".</p>
            </div>
          )}

          {categories.map((cat) => (
            <div key={cat.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  value={cat.category}
                  onChange={(e) => updateCategory(cat.id!, e.target.value)}
                  className="input flex-1"
                  placeholder="Category (e.g. Languages, Frameworks, Tools)"
                />
                <button type="button" onClick={() => removeCategory(cat.id!)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {cat.skills.map((skill, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full">
                    {skill}
                    <button type="button" onClick={() => removeSkill(cat.id!, idx)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSkillInput[cat.id!] || ''}
                  onChange={(e) => setNewSkillInput((p) => ({ ...p, [cat.id!]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(cat.id!))}
                  className="input flex-1 text-sm"
                  placeholder="Type skill and press Enter"
                />
                <button type="button" onClick={() => addSkill(cat.id!)} className="btn-secondary text-sm py-1.5 px-3">Add</button>
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
