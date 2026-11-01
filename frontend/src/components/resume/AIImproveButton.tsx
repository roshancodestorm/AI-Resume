import { useState } from 'react'
import { aiApi } from '../../api/ai'
import { Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  sectionType: string
  content: unknown
  context?: string
  onResult: (improved: string) => void
}

export default function AIImproveButton({ sectionType, content, context, onResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)

  const handleImprove = () => {
    setLoading(true)
    let result = ''

    aiApi.improveSection(
      sectionType,
      content,
      context,
      (chunk) => {
        result += chunk
        setStreaming(true)
      },
      () => {
        setLoading(false)
        setStreaming(false)
        onResult(result)
        toast.success('AI improvements applied!')
      },
      (err) => {
        setLoading(false)
        setStreaming(false)
        toast.error('AI request failed: ' + err.message)
      }
    )
  }

  return (
    <button
      type="button"
      onClick={handleImprove}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors disabled:opacity-60"
    >
      <Sparkles className="w-3.5 h-3.5" />
      {streaming ? 'Improving…' : loading ? 'Asking AI…' : 'Improve with AI'}
    </button>
  )
}
