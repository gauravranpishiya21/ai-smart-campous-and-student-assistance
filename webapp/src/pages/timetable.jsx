import { useMemo, useState } from 'react'
import { CalendarDays, BookMarked, GraduationCap } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Tabs } from '../components/ui/tabs'
import { Spinner, ErrorState, EmptyState, useAsync } from '../components/ui/states'
import { get, post } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtDate, today as td } from '../lib/utils'
import { asList, money } from '../lib/helpers'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

const normDay = (raw) => {
  const s = String(raw ?? '').toLowerCase()
  const num = Number(s)
  if (!isNaN(num) && s !== '') return DAY_ORDER[num] || 'Monday'
  const idx = DAY_ORDER.findIndex((d) => s.startsWith(d.toLowerCase().slice(0, 3)))
  return idx >= 0 ? DAY_ORDER[idx] : 'Monday'
}

const dayMoment = (raw) => {
  // '9:00' or '09:00' → minutes since midnight, so mid-day sorting is natural
  const m = String(raw ?? '').match(/(\d{1,2}):(\d{2})/)
  const h = Number(m?.[1] || 0)
  const min = Number(m?.[2] || 0)
  return h < 8 ? (h + 12) * 60 + min : h * 60 + min
}

export default function Timetable() {
  const [tab, setTab] = useState('week')
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Timetable & syllabus</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your weekly schedule and the subjects you're enrolled in.</p>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[{ value: 'week', label: 'Week' }, { value: 'syllabus', label: 'Syllabus' }]}
        />
      </header>
      {tab === 'week' ? <WeekView /> : <Syllabus />}
    </div>
  )
}

function WeekView() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(
    () => get(`/api/timetable/${user?.dept_id || 1}/${user?.semester_id || 4}`),
    [user?.dept_id, user?.semester_id]
  )
  const items = asList(data?.items ?? data)
  const [focus, setFocus] = useState(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][new Date().getDay() - 1] || 'Monday')

  const byDay = useMemo(() => {
    const map = {}
    for (const it of items) {
      const d = normDay(it.day_of_week)
      ;(map[d] = map[d] || []).push(it)
    }
    for (const d of Object.keys(map)) map[d].sort((a, b) => dayMoment(a.start_time) - dayMoment(b.start_time))
    return map
  }, [items])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (items.length === 0)
    return <EmptyState icon={CalendarDays} title="No timetable yet" description="The office hasn't published your class schedule. Check back soon." />

  const todayName = DAY_ORDER[(new Date().getDay() + 6) % 7]

  // Mobile: day selector. Desktop: full grid.
  return (
    <>
      {/* Mobile day cards */}
      <div className="space-y-4 lg:hidden">
        {DAY_ORDER.filter((d) => (byDay[d] || []).length).map((d) => (
          <section key={d}>
            <h2 className={'mb-2 flex items-center gap-2 text-sm font-semibold ' + (d === todayName ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-500')}>
              {DAY_SHORT[d]}
              {d === todayName && <Badge tone="indigo">Today</Badge>}
            </h2>
            <div className="space-y-2">
              {(byDay[d] || []).map((t, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-3 py-3 pl-4">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.start_time}</p>
                      <p className="text-[10px] text-zinc-400">{t.end_time}</p>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-zinc-100 pl-3 dark:border-zinc-800">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.subject_name}</p>
                      <p className="text-[11px] text-zinc-500">{t.room_number || 'Room TBA'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop grid */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900 hidden lg:block">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-zinc-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800">Time</th>
              {DAY_ORDER.slice(0, 6).map((d) => (
                <th key={d} className={'border-b border-l border-zinc-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide dark:border-zinc-800 ' + (d === todayName ? 'text-brand-700 dark:text-brand-300' : 'text-zinc-400')}>
                  {d}
                  {d === todayName && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-500 align-middle" aria-hidden />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const slots = Array.from(new Map(items.map((t) => [`${t.start_time}–${t.end_time}`, t])).keys()).sort(
                (a, b) => dayMoment(a.split('–')[0]) - dayMoment(b.split('–')[0])
              )
              return slots.map((slot) => {
                const [st, en] = slot.split('–')
                return (
                  <tr key={slot} className="align-top">
                    <td className="px-3 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {st}
                      <span className="block text-[10px] font-normal text-zinc-400">{en}</span>
                    </td>
                    {DAY_ORDER.slice(0, 6).map((d) => {
                      const cls = (byDay[d] || []).filter((t) => `${t.start_time}–${t.end_time}` === slot)
                      return (
                        <td key={d} className="border-l border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                          {cls.map((t, i) => (
                            <div key={i} className="mb-1.5 rounded-lg border border-brand-100 bg-brand-50/70 px-2.5 py-2 text-xs dark:border-brand-500/20 dark:bg-brand-500/10">
                              <p className="font-semibold text-brand-800 dark:text-brand-200">{t.subject_name}</p>
                              <p className="mt-0.5 text-[11px] text-brand-700/70 dark:text-brand-300/80">{t.room_number || 'Room TBA'}</p>
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            })()}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Syllabus() {
  const { user } = useAuth()
  const curriculums = useAsync(() => get('/api/curriculums'), [])
  const currId = curriculums.data ? (asList(curriculums.data)[0]?.id ?? 1) : null
  const semesters = useAsync(() => (currId ? get(`/api/curriculums/${currId}/semesters`) : Promise.resolve(null)), [currId])
  const semRows = asList(semesters.data)
  const semId = user?.semester_id || (semRows[0]?.id ?? null)
  const subjects = useAsync(() => (semId ? get(`/api/semesters/${semId}/subjects`) : Promise.resolve(null)), [semId])
  const rows = asList(subjects.data)

  if (curriculums.loading || semesters.loading || subjects.loading) return <Spinner />
  if (subjects.error) return <ErrorState message={subjects.error} onRetry={subjects.reload} />
  if (rows.length === 0)
    return <EmptyState icon={BookMarked} title="Syllabus not published" description="Subjects will appear once the curriculum is published for your semester." />

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Code</th>
            <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Subject</th>
            <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credits</th>
            <th className="hidden px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400 sm:table-cell">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
              <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{s.code || '—'}</td>
              <td className="px-5 py-3.5 font-medium text-zinc-900 dark:text-zinc-100">{s.name || s.title}</td>
              <td className="px-5 py-3.5 text-right text-xs text-zinc-500">{s.credits ?? '—'}</td>
              <td className="hidden px-5 py-3.5 sm:table-cell"><Badge>{s.type || s.category || 'Core'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}