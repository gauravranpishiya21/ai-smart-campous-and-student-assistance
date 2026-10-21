import { CalendarCheck2, Info, Timer, ShieldAlert } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress, RingProgress } from '../components/ui/progress'
import { Spinner, ErrorState, EmptyState } from '../components/ui/states'
import { useAsync } from '../components/ui/states'
import { get } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Attendance() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(() => get('/api/attendance/summary/me'), [])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <EmptyState icon={CalendarCheck2} title="No attendance data" description="Once faculty start marking attendance, your summary appears here." />

  const pct = Math.max(0, Math.min(100, Number(data.percentage) || 0))
  const color = pct >= data.target ? '#10b981' : pct >= data.target - 5 ? '#f59e0b' : '#ef4444'
  const tone = pct >= data.target ? 'green' : pct >= data.target - 5 ? 'amber' : 'red'
  const ring = pct >= data.target ? 'bg-emerald-500' : pct >= data.target - 5 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Attendance</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Live summary from the registrar. Marking is done by faculty during class.</p>
      </header>

      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <div className="relative">
              <RingProgress value={pct} size={132} stroke={11} tone={color} />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{pct}%</p>
                  <p className="text-[11px] text-zinc-400">attendance</p>
                </div>
              </div>
            </div>
            <div className="w-full flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Present" value={data.present} tone="text-emerald-600 dark:text-emerald-400" />
                <Stat label="Absent" value={data.absent} tone="text-rose-600 dark:text-rose-400" />
                <Stat label="Total" value={data.total_classes} tone="text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">Progress to {data.target}% target</span>
                  <Badge tone={tone}>{pct >= data.target ? 'On track' : 'Below target'}</Badge>
                </div>
                <Progress value={(pct / data.target) * 100} tone={pct >= data.target ? 'green' : 'amber'} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
              <CardTitle>Skip headroom</CardTitle>
            </div>
            <CardDescription>Classes you can still miss while keeping {data.target}%</CardDescription>
          </CardHeader>
          <CardContent>
            {data.can_miss ? (
              <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {data.can_miss} <span className="text-sm font-medium text-zinc-500">classes left as buffer</span>
              </p>
            ) : (
              <p className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                No buffer left — attend everything from here on to stay above the target.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-zinc-400" aria-hidden />
              <CardTitle>Today</CardTitle>
            </div>
            <CardDescription>{data.marked_today || 'No classes marked for you yet'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Attendance for today appears after faculty mark the register. Ask in the general chat if you think a mark is missing.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2 py-3 dark:bg-zinc-800/40">
      <p className={`text-xl font-bold ${tone}`}>{value ?? '—'}</p>
      <p className="mt-0.5 text-[11px] font-medium text-zinc-500">{label}</p>
    </div>
  )
}