import { useState } from 'react'
import { FolderKanban, Plus, ListChecks, MessagesSquare, ChevronRight, CircleDot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge, statusTone } from '../components/ui/badge'
import Button from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input, Label, Select, Textarea, FieldError } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { Spinner, ErrorState, EmptyState, LoadingRows, useAsync } from '../components/ui/states'
import { get, post } from '../lib/api'
import { useToast } from '../components/ui/toast'
import { fmtDate, fmtDateTime, today as td, cn } from '../lib/utils'
import { asList } from '../lib/helpers'

export default function Projects() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Projects</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your capstone work — milestones, guide and group discussions.</p>
      </header>
      <ProjectsBody />
    </div>
  )
}

function ProjectsBody() {
  const list = useAsync(() => get('/api/projects'), [])
  const rows = asList(list.data?.items ?? list.data)
  const [selected, setSelected] = useState(null)

  if (list.loading) return <Spinner />
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />
  if (rows.length === 0)
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects assigned yet"
        description="When your team registers a capstone project, it appears here with milestones and the guide."
      />
    )

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <ProjectCard key={p.id} p={p} onOpen={() => setSelected(p)} />
        ))}
      </div>
      <ProjectDrawer project={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function ProjectCard({ p, onOpen }) {
  const pct = Number(p.progress ?? 0)
  return (
    <Card className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop dark:hover:border-brand-800" onClick={onOpen}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{p.description || 'Team project'}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-zinc-600" aria-hidden />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={statusTone(p.status || '')}>{p.status || 'active'}</Badge>
          {p.guide_name && <Badge>Guide · {p.guide_name}</Badge>}
          {p.category && <Badge>{p.category}</Badge>}
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Milestones completed</span>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">{pct}%</span>
          </div>
          <Progress value={pct} tone={pct >= 100 ? 'green' : pct >= 40 ? 'brand' : 'amber'} />
        </div>
        {p.due_date && (
          <p className="mt-3 text-[11px] text-zinc-400">Due {fmtDate(p.due_date)}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProjectDrawer({ project, onClose }) {
  const detail = useAsync(() => (project ? get(`/api/projects/${project.id}`) : Promise.resolve(null)), [project?.id])
  const toast = useToast()
  const [tab, setTab] = useState('about')

  if (!project) return null
  const dd = detail.data || {}
  const d = dd.project || project
  const milestones = asList(dd.milestones)
  const updates = asList(dd.updates)
  const discussions = asList(dd.discussion)

  return (
    <Dialog open={!!project} onClose={onClose} size="lg" title={project.title} description={project.guide_name ? `Guide · ${project.guide_name}` : 'Team project'}>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70">
        {['about', 'milestones', 'updates', 'discussion'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ' +
              (tab === t ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-50' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-[200px] pt-4">
        {detail.loading ? (
          <LoadingRows rows={3} />
        ) : detail.error ? (
          <ErrorState message={detail.error} onRetry={detail.reload} />
        ) : tab === 'about' ? (
          <div className="space-y-4 pb-4">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{d.description || project.description || '—'}</p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <Info label="Category" value={d.category || project.category} />
              <Info label="Status" value={<Badge tone={statusTone(d.status || project.status)}>{d.status || project.status}</Badge>} />
              <Info label="Started" value={fmtDate(d.start_date || project.start_date)} />
              <Info label="Due" value={fmtDate(d.due_date || project.end_date)} />
              <Info label="Members" value={(d.members || [])?.length || (project.members || [].length) || '—'} />
              <Info label="Guide" value={d.guide_name || project.guide_name || 'TBA'} />
            </dl>
          </div>
        ) : tab === 'milestones' ? (
          <MilestoneList rows={milestones} onCompleted={detail.reload} toast={toast} />
        ) : tab === 'updates' ? (
          <UpdateList rows={updates} />
        ) : (
          <DiscussionList rows={discussions} onSent={detail.reload} toast={toast} />
        )}
      </div>
    </Dialog>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/40">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{value || '—'}</dd>
    </div>
  )
}

function MilestoneList({ rows, onCompleted, toast }) {
  const [busy, setBusy] = useState(null)
  if (rows.length === 0)
    return <EmptyState icon={ListChecks} title="No milestones yet" description="Your guide will break the project into milestones." />

  const complete = async (m) => {
    setBusy(m.id)
    try {
      await post(`/api/projects/${m.project_id || '0'}/milestones/${m.id}`, { status: 'done' })
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="space-y-2 pb-4">
      {rows.map((m) => {
        const done = ['done', 'completed'].includes((m.status || '').toLowerCase())
        return (
          <li key={m.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <CircleDot className={cn('h-4 w-4 shrink-0', done ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600')} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium text-zinc-900 dark:text-zinc-100', done && 'line-through text-zinc-400 dark:text-zinc-500')}>{m.title}</p>
              {m.due_date && <p className="text-[11px] text-zinc-400">Due {fmtDate(m.due_date)}</p>}
            </div>
            <Badge tone={done ? 'green' : statusTone(m.status)}>{m.status || 'pending'}</Badge>
          </li>
        )
      })}
    </ul>
  )
}

function UpdateList({ rows }) {
  if (rows.length === 0)
    return <EmptyState icon={ListChecks} title="No updates posted" description="Progress notes from your guide and team appear here." />
  return (
    <ul className="space-y-3 pb-3">
      {rows.map((u, i) => (
        <li key={u.id || i} className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{u.author_name || u.author || 'Guide'}</p>
            <p className="text-[10px] text-zinc-400">{fmtDateTime(u.created_at)}</p>
          </div>
          <p className="mt-1 text-sm leading-snug text-zinc-700 dark:text-zinc-300">{u.note || u.message}</p>
          {u.progress != null && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={u.progress} className="flex-1" tone={u.progress >= 100 ? 'green' : 'brand'} />
              <span className="text-[10px] font-semibold text-zinc-500">{u.progress}%</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function DiscussionList({ rows, onSent, toast }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!msg.trim() || busy) return
    setBusy(true)
    try {
      await post(`/api/projects/${rows[0]?.project_id}/discussion`, { message: msg.trim() })
      setMsg('')
      onSent?.()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3 pb-3">
      <ul className="space-y-3">
        {rows.map((u, i) => (
          <li key={u.id || i} className="flex gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              {(u.author_name || 'M').split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0 flex-1 rounded-xl bg-zinc-50 px-4 py-2.5 dark:bg-zinc-800/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{u.author_name || 'Member'}</p>
                <p className="text-[10px] text-zinc-400">{fmtDateTime(u.created_at)}</p>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-zinc-700 dark:text-zinc-300">{u.message || u.note}</p>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-center text-xs text-zinc-400">No messages yet — say hello to your team.</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); send() }}
      >
        <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message your project team…" aria-label="Message your project team" />
        <Button type="submit" loading={busy} disabled={!msg.trim()}>Send</Button>
      </form>
    </div>
  )
}