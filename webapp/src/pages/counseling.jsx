import { useState } from 'react'
import { MessagesSquare, Plus, CalendarX2, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge, statusTone } from '../components/ui/badge'
import Button from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input, Label, Select, FieldError } from '../components/ui/input'
import { Spinner, ErrorState, EmptyState, useAsync } from '../components/ui/states'
import { get, post } from '../lib/api'
import { useToast } from '../components/ui/toast'
import { today as td } from '../lib/utils'

export default function Counseling() {
  const toast = useToast()
  const list = useAsync(() => get('/api/counseling/appointments'), [])
  const appts = list.data?.appointments || []
  const counselors = list.data?.counselors || []

  const [bookOpen, setBookOpen] = useState(false)
  const [cancelling, setCancelling] = useState(null)

  const cancel = async (appt) => {
    setCancelling(appt.id)
    try {
      await post(`/api/counseling/cancel/${appt.id}`)
      toast('Appointment cancelled', 'info')
      list.reload()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Counseling</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Talk it out — academic, career or personal. Everything is confidential.
          </p>
        </div>
        <Button onClick={() => setBookOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Book session
        </Button>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
          Sessions are strictly private. Counselors share only attendance risk flags with the office — never what you discuss.
        </p>
      </div>

      {/* Counselors */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meet the counselors</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counselors.map((c) => (
            <Card key={c.name}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {c.name?.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</p>
                    <p className="text-[11px] text-zinc-400">{c.email}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">{c.role}</p>
                <p className="mt-1 text-[11px] text-zinc-400">Available: {c.availability}</p>
              </CardContent>
            </Card>
          ))}
          {counselors.length === 0 && !list.loading && (
            <p className="text-sm text-zinc-400">Counselor roster is being updated…</p>
          )}
        </div>
      </div>

      {/* Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-zinc-400" aria-hidden />
            <CardTitle>Your appointments</CardTitle>
          </div>
          <CardDescription>Upcoming and past sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {list.loading ? (
            <Spinner />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : appts.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No sessions booked" description="Booking takes a minute — pick a slot above." action={<Button size="sm" variant="subtle" onClick={() => setBookOpen(true)}>Book now</Button>} />
          ) : (
            <ul className="space-y-2">
              {appts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{a.appointment_date}</p>
                    <p className="truncate text-[11px] text-zinc-400">with {a.counselor_name}{a.notes ? ` · ${a.notes}` : ''}</p>
                  </div>
                  <Badge tone={statusTone(a.status || '')}>{a.status}</Badge>
                  {['scheduled', 'approved'].includes(a.status || '') && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(a)} loading={cancelling === a.id} aria-label={`Cancel appointment on ${a.appointment_date}`}>
                      <CalendarX2 className="h-3.5 w-3.5" aria-hidden /> Cancel
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BookDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        counselors={counselors}
        onDone={() => {
          setBookOpen(false)
          toast('Counseling session booked', 'success')
          list.reload()
        }}
      />
    </div>
  )
}

function BookDialog({ open, onClose, counselors, onDone }) {
  const [counselor, setCounselor] = useState('')
  const [date, setDate] = useState(td())
  const [time, setTime] = useState('15:00')
  const [topic, setTopic] = useState('Academic stress')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const chosen = counselor || counselors[0]?.name || 'Dr. Rajesh Sharma'

  const submit = async () => {
    if (!date || !time || busy) return
    setBusy(true)
    setErr('')
    try {
      await post('/api/counseling/book', { counselor_name: chosen, appointment_date: `${date} ${time}`, notes: topic })
      onDone?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Book a counseling session"
      description="Pick a slot — the counselor's office confirms by email."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!date || !time}>Confirm booking</Button>
        </>
      }
    >
      <div className="space-y-4 pb-4">
        {counselors.length > 0 && (
          <div>
            <Label htmlFor="cn-counselor">Counselor</Label>
            <Select
              id="cn-counselor"
              value={chosen}
              onChange={(e) => setCounselor(e.target.value)}
            >
              {counselors.map((c) => (
                <option key={c.name} value={c.name}>{c.name} — {c.role}</option>
              ))}
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cn-date" required>Date</Label>
            <Input id="cn-date" type="date" min={td()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cn-time" required>Time</Label>
            <Input id="cn-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="cn-topic">Topic</Label>
          <Select id="cn-topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
            {['Academic stress', 'Career guidance', 'Personal wellbeing', 'Study skills', 'Other'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <FieldError>{err}</FieldError>
      </div>
    </Dialog>
  )
}