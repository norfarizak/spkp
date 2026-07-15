'use client'
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bot, Send, X, Sparkles, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content: 'Assalamualaikum! Saya GLM Assistant SPKP-JTM. Saya boleh membantu anda menjana draf WIM, kurikulum, rubrik, melakukan mapping NOSS, dan menjawab soalan tentang sistem. Apa yang boleh saya bantu hari ini?',
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  async function send() {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMsgs((m) => [...m, { role: 'user', content: q, ts: Date.now() }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI gagal menjawab')
      setMsgs((m) => [...m, { role: 'assistant', content: data.reply, ts: Date.now() }])
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'assistant', content: `⚠️ Maaf, ralat berlaku: ${e.message}. Sila cuba lagi.`, ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 ai-bubble rounded-full w-14 h-14 flex items-center justify-center hover-lift group"
          aria-label="Buka AI Assistant"
        >
          <Bot className="w-7 h-7 text-cyan-300" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 pulse-soft" />
          <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
            AI Assistant (GLM 5.2)
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 ai-bubble rounded-2xl w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden fade-in-up">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/15 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                GLM Assistant
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 pulse-soft" /> Online
                </span>
              </div>
              <div className="text-[10px] text-cyan-100/60">Dikuasakan z.ai GLM 5.2</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-cyan-100/70 hover:text-white flex items-center justify-center transition"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-area">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-sm'
                      : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white rounded-2xl rounded-bl-sm border border-white/10 px-3 py-2 flex items-center gap-2 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> GLM sedang menaip...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 pb-1 flex gap-1 flex-wrap">
            {['Jana draf WIM', 'Terangkan NOSS', 'Buat rubrik'].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-[10px] bg-white/5 hover:bg-white/10 text-cyan-100/80 px-2 py-1 rounded-full border border-white/10"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/15 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Tanya AI..."
              className="bg-white/8 border-white/15 text-white placeholder:text-white/40 text-sm"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 border-0 h-9 w-9"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="px-3 pb-2 text-[9px] text-amber-200/60 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Output AI adalah draf — perlu semakan manusia sebelum digunakan.
          </div>
        </div>
      )}
    </>
  )
}
