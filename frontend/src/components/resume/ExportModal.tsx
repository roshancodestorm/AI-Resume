import { useState } from 'react'
import { resumesApi } from '../../api/resumes'
import { TemplateType } from '../../types'
import { X, Download, FileText, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const TEMPLATES: { id: TemplateType; name: string; description: string; preview: string }[] = [
  { id: 'modern', name: 'Modern', description: 'Clean dark header, color accents, skill tags', preview: '🎨' },
  { id: 'classic', name: 'Classic', description: 'Traditional serif font, timeless layout', preview: '📄' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra-clean, light typography, whitespace-focused', preview: '✨' },
]

interface Props {
  resumeId: number
  onClose: () => void
}

export default function ExportModal({ resumeId, onClose }: Props) {
  const [selected, setSelected] = useState<TemplateType>('modern')
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    setDownloading(true)
    try {
      await resumesApi.downloadPdf(resumeId, selected)
      toast.success('Resume PDF downloaded successfully!')
      onClose()
    } catch (err: any) {
      // Fallback: try opening direct URL
      try {
        const directUrl = resumesApi.exportPdf(resumeId, selected)
        window.open(directUrl, '_blank')
        toast.success('Opened PDF export in browser tab.')
        onClose()
      } catch {
        toast.error('Failed to generate PDF. Please try again.')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" /> Export Resume as PDF
          </h2>
          <button onClick={onClose} disabled={downloading} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-500 mb-4">Choose a template for your PDF export:</p>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              disabled={downloading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selected === t.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{t.preview}</span>
              <div>
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </div>
              {selected === t.id && (
                <span className="ml-auto flex items-center gap-1 text-primary-600 font-semibold text-sm">
                  <Check className="w-4 h-4" /> Selected
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} disabled={downloading} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleExport} disabled={downloading} className="btn-primary flex-1">
            {downloading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating PDF…
              </span>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
