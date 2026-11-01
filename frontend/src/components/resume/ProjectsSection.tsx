import { useState } from 'react'
import { ResumeSection, ProjectItem } from '../../types'
import AIImproveButton from './AIImproveButton'
import { Code, Plus, Trash2, X, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { nanoid } from '../../utils/nanoid'

interface Props {
  section: ResumeSection
  onSave: (content: ProjectItem[]) => Promise<void>
}

export default function ProjectsSection({ section, onSave }: Props) {
  const [items, setItems] = useState<ProjectItem[]>((section.content as ProjectItem[]) || [])
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const [techInput, setTechInput] = useState<Record<string, string>>({})

  const addItem = () =>
    setItems((p) => [...p, { id: nanoid(), name: '', description: '', url: '', technologies: [] }])

  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id))

  const update = (id: string, field: keyof ProjectItem, val: unknown) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)))

  const addTech = (id: string) => {
    const tech = techInput[id]?.trim()
    if (!tech) return
    setItems((p) => p.map((i) => i.id === id ? { ...i, technologies: [...i.technologies, tech] } : i))
    setTechInput((p) => ({ ...p, [id]: '' }))
  }

  const removeTech = (id: string, idx: number) =>
    setItems((p) => p.map((i) => i.id === id ? { ...i, technologies: i.technologies.filter((_, ti) => ti !== idx) } : i))

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
          <Code className="w-4 h-4 text-primary-500" /> {section.title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{items.length} projects</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="card-body space-y-4">
          <div className="flex justify-between items-center">
            <AIImproveButton sectionType="projects" content={items} onResult={(r) => { try { setItems(JSON.parse(r)) } catch {} }} />
            <button type="button" onClick={addItem} className="btn-ghost text-sm">
              <Plus className="w-4 h-4" /> Add project
            </button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <Code className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No projects yet.</p>
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-end">
                <button type="button" onClick={() => removeItem(item.id!)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Project Name *</label>
                  <input value={item.name} onChange={(e) => update(item.id!, 'name', e.target.value)} className="input" placeholder="My Awesome App" />
                </div>
                <div>
                  <label className="label">URL (optional)</label>
                  <input value={item.url || ''} onChange={(e) => update(item.id!, 'url', e.target.value)} className="input" placeholder="github.com/you/project" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => update(item.id!, 'description', e.target.value)}
                    rows={2}
                    className="input resize-none"
                    placeholder="What did you build and what problem does it solve?"
                  />
                </div>
              </div>
              <div>
                <label className="label">Technologies</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {item.technologies.map((t, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                      {t}
                      <button type="button" onClick={() => removeTech(item.id!, idx)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={techInput[item.id!] || ''}
                    onChange={(e) => setTechInput((p) => ({ ...p, [item.id!]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTech(item.id!))}
                    className="input flex-1 text-sm"
                    placeholder="React, TypeScript, PostgreSQL…"
                  />
                  <button type="button" onClick={() => addTech(item.id!)} className="btn-secondary text-sm py-1.5 px-3">Add</button>
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
