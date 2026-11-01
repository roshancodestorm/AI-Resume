import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, X, Send, User, Bot, Sparkles, Check, Trash2, Volume2, VolumeX, Search, Globe, ChevronDown } from 'lucide-react'
import { coachChat, applyCoachSection, CoachChatResponse, coachTTS } from '../../api/ai'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { SUPPORTED_LANGUAGES, Language } from '../../constants/languages'
import { useAuth } from '../../contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function VoiceAssistant() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { id: resumeId } = useParams<{ id: string }>()

  if (authLoading || !isAuthenticated) {
    return null
  }

  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<CoachChatResponse | null>(null)
  const [speechEnabled, setSpeechEnabled] = useState(true)
  const [language, setLanguage] = useState<string>('en-US')
  const [isLangListOpen, setIsLangListOpen] = useState(false)
  const [langSearchQuery, setLangSearchQuery] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis)
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isExplicitlyStopped = useRef<boolean>(true)

  // Auto-stop microphone after 2 minutes
  const startAutoStopTimer = () => {
    if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current)
    autoStopTimeoutRef.current = setTimeout(() => {
      console.log('Auto-stopping mic after 2 minutes')
      isExplicitlyStopped.current = true
      recognitionRef.current?.stop()
      setIsListening(false)
      toast.success('Mic auto-stopped after 2 minutes to save battery.')
    }, 120000) // 2 minutes
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser')
      return
    }
    
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      
      recognitionRef.current.onstart = () => {
        console.log('Voice recognition started')
        setIsListening(true)
      }

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript = event.results[i][0].transcript
           if (finalTranscript.trim()) {
              console.log('Final transcript chunk:', finalTranscript)
              handleSendMessage(finalTranscript)
              startAutoStopTimer() // Reset timer on every successful speech input
            }
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }

        if (interimTranscript) {
          setInputText(interimTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'not-allowed') {
          setIsListening(false)
          isExplicitlyStopped.current = true
          toast.error('Mic permission denied. Please allow microphone access.')
        } else if (event.error === 'network') {
          toast.error('Network error occurred during speech recognition.')
        }
      }

      recognitionRef.current.onend = () => {
        console.log('Voice recognition ended. Explicitly stopped:', isExplicitlyStopped.current)
        // If it stopped but not by user or timeout, restart it to keep it active
        if (!isExplicitlyStopped.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.error('Failed to restart recognition', e)
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }
    }

    // Update language dynamically based on selector
    recognitionRef.current.lang = language

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current)
      }
    }
  }, [language])

  const speak = async (text: string) => {
    if (!speechEnabled) return
    
    // Stop current speaking
    synthRef.current?.cancel()

    try {
      const audioBlob = await coachTTS(text)
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      audio.onerror = () => setIsSpeaking(false)
      
      audio.play()
    } catch (error) {
      console.error('ElevenLabs TTS failed, falling back to browser:', error)
      // Fallback to browser synthesis
      if (!synthRef.current) return
      
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = synthRef.current.getVoices()
      
      const isMarathi = /[क-ह]/.test(text) && (text.includes('आहे') || text.includes('केला') || text.includes('नाही'))
      const isHindi = /[क-ह]/.test(text)
      
      let targetVoice = null
      if (isMarathi) {
        targetVoice = voices.find(v => v.lang.includes('mr') || v.lang.includes('hi'))
        utterance.lang = 'mr-IN'
      } else if (isHindi) {
        targetVoice = voices.find(v => v.lang.includes('hi'))
        utterance.lang = 'hi-IN'
      } else {
        utterance.lang = language // Use selected language for fallback
        targetVoice = voices.find(v => v.lang.includes(language.split('-')[0]))
      }
      
      if (targetVoice) utterance.voice = targetVoice
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      isExplicitlyStopped.current = true
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current)
      recognitionRef.current?.stop()
    } else {
      if (!recognitionRef.current) {
        toast.error('Speech recognition not supported in this browser.')
        return
      }
      
      isExplicitlyStopped.current = false
      startAutoStopTimer()
      
      // Ensure the correct language is set right before starting
      recognitionRef.current.lang = language
      
      synthRef.current?.cancel() 
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error('Failed to start recognition', e)
        isExplicitlyStopped.current = true
      }
    }
  }

  const handleSendMessage = async (text: string) => {
    const msg = text || inputText
    if (!msg.trim()) return

    const newMessages = [...messages, { role: 'user', content: msg } as Message]
    setMessages(newMessages)
    setInputText('')
    setIsLoading(true)

    try {
      const response = await coachChat({
        message: msg,
        resume_id: resumeId ? parseInt(resumeId) : undefined,
        conversation_history: messages.slice(-5),
        preferred_language: language,
      })

      setMessages([...newMessages, { role: 'assistant', content: response.reply }])
      
      if (response.voice_reply) {
        speak(response.voice_reply)
      }

      if (response.action === 'confirm_draft' && response.draft_section) {
        setCurrentDraft(response)
      } else {
        setCurrentDraft(null)
      }
    } catch (error) {
      toast.error('Failed to get response from AI Coach')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyDraft = async () => {
    if (!resumeId || !currentDraft?.draft_section) return
    
    setIsLoading(true)
    try {
      await applyCoachSection(
        parseInt(resumeId),
        currentDraft.draft_section.section_type,
        currentDraft.draft_section.content,
        currentDraft.draft_section.title
      )
      toast.success('Resume updated successfully!')
      setMessages([...messages, { role: 'assistant', content: 'Maine resume update kar diya hai! ✅' }])
      setCurrentDraft(null)
      // Refresh page to see changes if needed, or trigger global refresh
      window.location.reload()
    } catch (error) {
      toast.error('Failed to update resume')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(langSearchQuery.toLowerCase())
  )

  const selectedLangName = SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || 'English'

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center z-50 group"
      >
        <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-3 bg-gray-900 text-white px-3 py-1 rounded text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Talk to AI Coach
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:h-[600px] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold leading-none">Aura AI Coach</h3>
            <span className="text-xs text-indigo-100">Active now</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLangListOpen(!isLangListOpen)}
            className="flex items-center gap-1 bg-indigo-700 text-[10px] px-2 py-1 rounded hover:bg-indigo-800 transition-colors"
          >
            <Globe className="w-3 h-3" />
            <span>{selectedLangName}</span>
            <ChevronDown className={clsx("w-2 h-2 transition-transform", isLangListOpen && "rotate-180")} />
          </button>
          <button 
            onClick={() => setSpeechEnabled(!speechEnabled)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Language Selection Overlay */}
      {isLangListOpen && (
        <div className="absolute inset-x-0 top-[60px] bottom-0 bg-white z-[60] flex flex-col animate-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search language..."
                value={langSearchQuery}
                onChange={(e) => setLangSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code)
                  setIsLangListOpen(false)
                  setLangSearchQuery('')
                }}
                className={clsx(
                  "w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center justify-between",
                  language === lang.code && "text-indigo-600 font-medium bg-indigo-50"
                )}
              >
                {lang.name}
                {language === lang.code && <Check className="w-4 h-4" />}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                No languages found matching "{langSearchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <p className="text-gray-900 font-medium">Namaste! Main Aura hoon.</p>
              <p className="text-sm text-gray-500 px-8 mt-1">
                Aap mujhse baat karke resume bana sakte hain ya career advice le sakte hain.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 px-4">
              <button 
                onClick={() => handleSendMessage("Suggest targeted job roles for me.")}
                className="text-xs bg-white border border-gray-200 p-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                "Suggest job roles for me"
              </button>
              <button 
                onClick={() => handleSendMessage("Help me add a new project.")}
                className="text-xs bg-white border border-gray-200 p-2 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                "Help me add a new project"
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={clsx("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={clsx(
              "max-w-[85%] p-3 rounded-2xl text-sm shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
            )}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase tracking-wider font-bold">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                {msg.role === 'user' ? 'You' : 'Aura'}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {/* Draft Confirmation Card */}
        {currentDraft && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              New Draft Ready
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-100 text-xs text-gray-700 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">
                {JSON.stringify(currentDraft.draft_section?.content, null, 2)}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyDraft}
                className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Save to Resume
              </button>
              <button
                onClick={() => setCurrentDraft(null)}
                className="px-3 bg-white border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              isListening 
                ? "bg-red-100 text-red-600 animate-pulse" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
            placeholder={isListening ? "Listening..." : "Type or speak..."}
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />

          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {isListening && (
          <p className="text-[10px] text-center mt-2 text-gray-400 animate-pulse">
            Aura is listening... Go ahead and speak!
          </p>
        )}
      </div>
    </div>
  )
}
