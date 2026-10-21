import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, SendHorizontal, Hash, Users } from 'lucide-react'
import { Card } from '../components/ui/card'
import Button from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { cn, initials, fmtDateTime } from '../lib/utils'
import { get, post } from '../lib/api'
import { useAuth } from '../lib/auth'

const CHANNELS = [
  { id: 'general', label: 'General', desc: 'Dept-wide chatter' },
  { id: 'study-circle', label: 'Study circle', desc: 'Doubts & juniors' },
  { id: 'project-hub', label: 'Project hub', desc: 'Team sync' },
]

export default function GroupChat() {
  const { user } = useAuth()
  const [channel, setChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scroller = useRef(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)

  const load = useCallback(async (ch) => {
    setLoading(true)
    setErr('')
    try {
      const res = await get(`/api/group-chat/messages?channel=${encodeURIComponent(ch)}`)
      setMessages(res.messages || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(channel) }, [channel, load])

  useEffect(() => {
    if (!loading) scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [messages, loading])

  const send = async () => {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    setInput('')
    try {
      const res = await post('/api/group-chat/send', { channel, message: msg })
      setMessages((ms) => [...ms, res.data || { message: msg, user_name: user.name || 'You', created_at: new Date().toISOString() }])
    } catch {
      setInput(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-11.5rem)] gap-4 animate-fade-in lg:h-[calc(100vh-10rem)]">
      {/* Channel list */}
      <div className={cn('w-60 shrink-0 flex-col gap-2', mobileListOpen ? 'flex' : 'hidden lg:flex')}>
        <div className="flex items-center gap-2 px-1">
          <Hash className="h-4 w-4 text-zinc-400" aria-hidden />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Channels</p>
        </div>
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => { setChannel(c.id); setMobileListOpen(false) }}
            className={cn(
              'rounded-xl border px-3.5 py-3 text-left transition-colors',
              channel === c.id
                ? 'border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10'
                : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
            )}
            aria-current={channel === c.id ? 'true' : undefined}
          >
            <p className={cn('text-sm font-semibold', channel === c.id ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-800 dark:text-zinc-200')}>
              # {c.label}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">{c.desc}</p>
          </button>
        ))}
      </div>

      {/* Conversation */}
      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileListOpen((v) => !v)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
              aria-label="Show channels"
            >
              <Hash className="h-4 w-4" aria-hidden />
            </button>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"># {CHANNELS.find((c) => c.id === channel)?.label}</p>
          </div>
          <Badge tone="indigo"><MessageCircle className="h-3 w-3" aria-hidden />{(loading ? '…' : messages.length) || 0}</Badge>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Channel messages">
          {loading ? (
            <p className="py-10 text-center text-xs text-zinc-400">Loading messages…</p>
          ) : err ? (
            <p className="py-10 text-center text-xs text-rose-500">{err}</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-xs text-zinc-400">No messages yet — start the conversation.</p>
          ) : (
            messages.map((m, i) => {
              const mine = Number(m.user_id) === Number(user?.id)
              return (
                <div key={m.id || i} className={cn('flex gap-2.5', mine && 'flex-row-reverse')}>
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {initials(m.user_name || m.author_name)}
                  </span>
                  <div className={cn('max-w-[75%]', mine && 'text-right')}>
                    <div className={cn('mb-0.5 flex items-baseline gap-2', mine && 'flex-row-reverse')}>
                      <p className="truncate text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{mine ? 'You' : m.user_name || m.author_name || 'Member'}</p>
                      <p className="text-[10px] text-zinc-400">{fmtDateTime(m.created_at)}</p>
                    </div>
                    <div
                      className={cn(
                        'inline-block max-w-full rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words text-left',
                        mine
                          ? 'bg-brand-600 text-white'
                          : 'border border-zinc-100 bg-zinc-50/80 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200'
                      )}
                    >
                      {m.message}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800"
          onSubmit={(e) => { e.preventDefault(); send() }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message # ${CHANNELS.find((c) => c.id === channel)?.label}…`}
            aria-label={`Message channel ${channel}`}
            className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-brand-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <Button type="submit" loading={sending} disabled={!input.trim()} aria-label="Send message">
            {sending ? null : <SendHorizontal className="h-4 w-4" aria-hidden />}
            Send
          </Button>
        </form>
      </Card>
    </div>
  )
}