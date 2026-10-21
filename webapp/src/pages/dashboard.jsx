import { Link } from 'react-router-dom'
import {
  CalendarCheck2, Wallet, Trophy, MessagesSquare, ArrowUpRight, Megaphone,
  CalendarDays, Sparkles, BookOpen, FileText, Wallet2, Sun, Coffee, Sunset,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress, RingProgress } from '../components/ui/progress'
import { Spinner, EmptyState } from '../components/ui/states'
import { useAsync, LoadingRows } from '../components/ui/states'
import { get } from '../lib/api'
import { asList } from '../lib/helpers'
import { useAuth } from '../lib/auth'
import { fmtDate, fmtDateTime } from '../lib/utils'

const greetings = [
  { icon: Sun, label: 'Good morning' },
  { icon: Coffee, label: 'Good afternoon' },
  { icon: Sunset, label: 'Good evening' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useAsync(() => get('/api/attendance/summary/me'), [])
  const finance = useAsync(() => get('/api/fees/student/me'), [])
  const gpa = useAsync(() => (user?.student_id ? get(`/api/gpa/${user.student_id}`) : Promise.resolve([])), [user?.student_id])
  const notices = useAsync(() => get('/announcements'), [])
  const chat = useAsync(() => get('/api/group-chat/messages'), [])
  const timetable = useAsync(() => get(`/api/timetable/${user?.dept_id || 1}/${user?.semester_id || 4}`), [user?.dept_id, user?.semester_id])

  const hour = new Date().getHours()
  const g = hour < 12 ? greetings[0] : hour < 17 ? greetings[1] : greetings[2]
  const GIcon = g.icon

  const gpaRows = asList(gpa.data)
  const cgpa = gpaRows.length ? gpaRows[gpaRows.length - 1] : null
  const dues = finance.data ? (finance.data.dues || 0) : null
  const att = summary.data

  const today = new Date().getDay() // 0 Sun..6 Sat
  const todayItems = (timetable.data?.items || [])
    .filter((t) => {
      const d = String(t.day_of_week || '').toLowerCase()
      const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const idx = d.startsWith('0') ? Number(d) : map.findIndex((m) => d.startsWith(m))
      return idx === today
    })
    .sort((a, b) => {
      const mm = (r) => String(r.start_time || '').match(/(\d{1,2}):(\d{2})/)
      const mins = (r) => { const m = mm(r); const h = Number(m?.[1] || 0); return (h < 8 ? h + 12 : h) * 60 + Number(m?.[2] || 0) }
      return mins(a) - mins(b)
    })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <GIcon className="h-4 w-4" aria-hidden />
          <span>{g.label},</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user?.name || 'Student'}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Here's your campus at a glance
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CalendarCheck2}
          label="Attendance"
          value={att ? `${att.percentage}%` : null}
          sub={att ? `Target ${att.target}% · ${att.can_miss ? `you can skip ${att.can_miss} more` : 'at risk of being short'}` : 'Loading…'}
          loading={summary.loading}
          error={summary.error}
          active={att?.can_miss}
        />
        <KpiCard
          icon={Wallet}
          label="Fee dues"
          value={dues !== null ? `₹${dues.toLocaleString('en-IN')}` : null}
          sub={finance.data ? `${finance.data.paid_pct}% of assessed fees cleared` : 'Loading…'}
          loading={finance.loading}
          error={finance.error}
          good={dues === 0}
        />
        <KpiCard
          icon={Trophy}
          label="Latest GPA"
          value={cgpa?.gpa || cgpa?.cgpa ? Number(cgpa.gpa || cgpa.cgpa).toFixed(2) : null}
          sub={gpaRows.length ? `Semester ${cgpa.semester} record` : 'No records yet'}
          loading={gpa.loading}
          error={gpa.error}
        />
        <KpiCard
          icon={MessagesSquare}
          label="Campus chat"
          value={chat.data?.messages ? `${chat.data.messages.length} messages` : null}
          sub="General channel"
          loading={chat.loading}
          error={chat.error}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Today's classes */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Today's classes</CardTitle>
              <CardDescription>{todayItems.length ? `${todayItems.length} scheduled` : 'From your timetable'}</CardDescription>
            </div>
            <Link to="/timetable" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              View timetable <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {timetable.loading ? (
              <LoadingRows rows={3} />
            ) : timetable.error ? (
              <EmptyState title="Couldn't load timetable" description={timetable.error} />
            ) : todayItems.length === 0 ? (
              <EmptyState icon={CalendarDays} title={today === 0 || today === 6 ? 'No classes on weekends' : 'No classes today'} description="Enjoy the free day — or catch up in the library." />
            ) : (
              <ul className="space-y-2">
                {todayItems.map((t, i) => (
                  <li key={i} className="flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.start_time}</p>
                      <p className="text-[11px] text-zinc-400">{t.end_time}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.subject_name}</p>
                      <p className="text-[11px] text-zinc-500">{t.room_number}</p>
                    </div>
                    <Badge tone="indigo">{t.room_number}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Notices */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Notice board</CardTitle>
              <CardDescription>Latest from the office</CardDescription>
            </div>
            <Link to="/assistant" className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Ask AI <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            {notices.loading ? (
              <LoadingRows rows={3} />
            ) : (notices.data?.items || notices.data || []).length === 0 ? (
              <EmptyState icon={Megaphone} title="No notices yet" description="Campus announcements will appear here." />
            ) : (
              <ul className="space-y-3">
                {(notices.data?.items || notices.data || []).slice(0, 5).map((n, i) => (
                  <li key={n.id || i} className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                    <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-200">{n.message || n.title}</p>
                    {n.created_at && <p className="mt-1 text-[11px] text-zinc-400">{fmtDateTime(n.created_at)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <QuickLink to="/attendance" icon={CalendarCheck2} label="Mark & track attendance" tone="green" />
          <QuickLink to="/results" icon={FileText} label="Result report" tone="blue" />
          <QuickLink to="/fees" icon={Wallet2} label="Pay & view fees" tone="amber" />
          <QuickLink to="/library" icon={BookOpen} label="Digital library" tone="indigo" />
          <QuickLink to="/assistant" icon={Sparkles} label="AI assistant" tone="violet" />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, loading, error, good, active }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-300" aria-hidden />
          </span>
          {value !== null && good ? <Badge tone="green">All clear</Badge> : null}
          {value !== null && active ? <Badge tone="amber">Headroom</Badge> : null}
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" /> : value ?? <span className="text-zinc-400">—</span>}
        </p>
        <p className="mt-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">{error ? 'Unreachable right now' : sub}</p>
      </CardContent>
    </Card>
  )
}

const toneMap = {
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500',
  indigo: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
}

function QuickLink({ to, icon: Icon, label, tone }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-dark-card dark:hover:border-brand-800"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-xs font-semibold leading-snug text-zinc-800 dark:text-zinc-200">{label}</span>
    </Link>
  )
}