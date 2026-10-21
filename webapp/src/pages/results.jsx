import { Trophy, FileText, Download } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge, statusTone } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Spinner, ErrorState, useAsync } from '../components/ui/states'
import { get } from '../lib/api'
import { asList } from '../lib/helpers'
import { useAuth } from '../lib/auth'

const gradeTone = (grade = '') => {
  const g = grade.toUpperCase()
  if (g.startsWith('A') || g === 'O' || g === 'S') return 'green'
  if (g.startsWith('B')) return 'blue'
  if (g.startsWith('C') || g === 'P') return 'amber'
  if (['F', 'RA', 'W'].some((x) => g.startsWith(x))) return 'red'
  return 'neutral'
}

export default function Results() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(() => get('/api/student/result-report'), [])
  const gpaRows = useAsync(() => get(`/api/gpa/${user?.student_id || 1}`), [user?.student_id]).data
  const gpa = asList(gpaRows)

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const d = data || {}
  const grades = asList(d.grades)

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Result report</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {d.exam_session || 'Current session'} · {d.department || 'Department'}
        </p>
      </header>

      {/* Summary band */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Trophy className="h-6 w-6 text-amber-500" aria-hidden />
              </span>
              <div>
                <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{d.cgpa != null ? d.cgpa.toFixed(2) : '—'}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">CGPA</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
              <SumStat label="Academic standing" value={d.academic_status || '—'} />
              <SumStat label="Backlogs" value={String(d.backlogs ?? '—')} />
              <SumStat label="Subjects graded" value={String(grades.length)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semester GPA trend */}
      {gpa.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Semester GPA</CardTitle>
            <CardDescription>Credits earned each semester so far</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gpa.map((r) => (
              <div key={r.id || r.semester}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Semester {r.semester}</span>
                  <span className="flex items-center gap-2 text-zinc-500">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{Number(r.gpa).toFixed(1)}</span>
                    <span className="text-[11px]">{r.credits_earned} credits</span>
                    {(r.backlogs || 0) > 0 && <Badge tone="red">{r.backlogs} backlog</Badge>}
                  </span>
                </div>
                <Progress value={r.gpa * 10} tone={r.gpa >= 8 ? 'brand' : r.gpa >= 6 ? 'amber' : 'red'} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subject table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-400" aria-hidden />
            <CardTitle>Marks statement</CardTitle>
          </div>
          <CardDescription>Latest graded subjects with internal/external split</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-t border-zinc-100 dark:border-zinc-800">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Code</th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Subject</th>
                  <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Total</th>
                  <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credits</th>
                  <th className="px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Grade</th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/60 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">{g.subject_code}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{g.subject_name}</td>
                    <td className="px-5 py-3 text-center text-xs text-zinc-600 dark:text-zinc-300">{g.total_marks ?? '—'}</td>
                    <td className="px-5 py-3 text-center text-xs text-zinc-600 dark:text-zinc-300">{g.credits}</td>
                    <td className="px-5 py-3 text-center"><Badge tone={gradeTone(g.grade)}>{g.grade}</Badge></td>
                    <td className="px-5 py-3 text-right"><Badge tone={statusTone(g.status || '')} className="uppercase">{g.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SumStat({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  )
}