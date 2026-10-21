import { useState, useRef, useEffect } from 'react'
import { Sparkles, SendHorizonal, RotateCcw, Bot, User } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import Button from '../components/ui/button'
import { cn, fmtDateTime } from '../lib/utils'
import { post } from '../lib/api'
import { useToast } from '../components/ui/toast'

const SUGGESTIONS = [
  'Are there any new notices?',
  'What is the exam schedule?',
  'Any updates in the library?',
  'Summarize my academics',
]

export default function Assistant() {
  const toast = useToast()
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      kind: 'welcome',
      content:
        "Hi! I'm your campus AI assistant. Ask me about notices, the exam schedule, library arrivals or your academics — I read the college's own data.",
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ask = async (text) => {
    const q = (text ?? '').trim()
    if (!q || busy) return
    setInput('')
    setMessages((ms) => [...ms, { id: crypto.randomUUID?.() || String(Math.random()), role: 'user', content: q }])
    const Thinking = () => ''
    setBusy(true)
    try {
      const res = await post('/ai/advisor', { query: q })
      const data = res?.data || res || {}
      const text = data.answer || data.response || data.message ||
        (Array.isArray(data) ? data.join(', ') : Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.slice(0, 6).join(', ') : v}`).join('\n'))
      setMessages((ms) => [
        ...ms,
        {
          id: crypto.randomUUID?.() || String(Math.random()),
          role: 'assistant',
          content: text || 'Hmm — I could not find anything for that. Try asking about notices, exams or the library.',
        },
      ])
    } catch (e) {
      toast(e.message, 'error')
      setMessages((ms) => [...ms, { role: 'assistant', content: 'Sorry — I could not reach the campus index. Try again in a moment.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-11.5rem)] flex-col gap-4 animate-fade-in lg:h-[calc(100vh-10rem)]">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">AI assistant</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Answers from the college's own data — announcements, exams, library, academics.
        </p>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-5">
          <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" role="log" aria-live="polite" aria-label="Conversation">
            {messages.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 pl-1 text-xs text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                </span>
                Assistant is looking through campus data…
              </div>
            )}
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={busy}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-brand-800 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); ask(input) }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about notices, exams, library, academics…"
              aria-label="Ask the assistant"
              className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-brand-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Button type="submit" loading={busy} disabled={!input.trim()} aria-label="Send message">
              {busy ? null : <SendHorizonal className="h-4 w-4" aria-hidden />}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Bubble({ m }) {
  const isUser = m.role === 'user'
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg shadow-card',
          isUser ? 'bg-zinc-200 dark:bg-zinc-700' : 'bg-brand-600'
        )}
      >
        {isUser ? <User className="h-4 w-4 text-zinc-500 dark:text-zinc-300" aria-hidden /> : <Sparkles className="h-4 w-4 text-white" aria-hidden />}
      </span>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white'
            : 'border border-zinc-100 bg-zinc-50/80 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200'
        )}
      >
        <span className={cn(isUser && 'sr-only')}>{m.role === 'assistant' ? 'Assistant said: ' : ''}</span>
        {m.content}
      </div>
    </div>
  )
}