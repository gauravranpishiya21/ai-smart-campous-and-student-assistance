import { useState } from 'react'
import { Wallet, Receipt, GraduationCap, Plus, Clock3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge, statusTone } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import Button from '../components/ui/button'
import { Dialog } from '../components/ui/dialog'
import { Input, Label, Select, FieldError } from '../components/ui/input'
import { Spinner, ErrorState, EmptyState, useAsync } from '../components/ui/states'
import { post, get } from '../lib/api'
import { useToast } from '../components/ui/toast'
import { fmtDate, today as td } from '../lib/utils'
import { money } from '../lib/helpers'

export default function Fees() {
  const toast = useToast()
  const summary = useAsync(() => get('/api/fees/student/me'), [])
  const my = useAsync(() => get('/api/fees/scholarships/me'), [])
  const [applyOpen, setApplyOpen] = useState(false)

  const refresh = () => { summary.reload(); my.reload() }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Fees & scholarships</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Everything about your academic finances in one place.</p>
        </div>
      </header>

      {summary.loading ? <Spinner /> : summary.error ? <ErrorState message={summary.error} onRetry={summary.reload} /> : <Summary s={summary.data} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Receipts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-zinc-400" aria-hidden />
              <CardTitle>Receipts</CardTitle>
            </div>
            <CardDescription>Past fee payments (cash & UPI at the counter)</CardDescription>
          </CardHeader>
          <CardContent>
            <Receipts data={summary} />
          </CardContent>
        </Card>

        {/* Scholarships */}
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-500" aria-hidden />
                <CardTitle>Scholarships</CardTitle>
              </div>
              <CardDescription>Apply to a scheme; approval is by the office.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setApplyOpen(true)}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Apply
            </Button>
          </CardHeader>
          <CardContent>
            <MyScholarships data={my} onApply={() => setApplyOpen(true)} />
          </CardContent>
        </Card>
      </div>

      <ApplyDialog open={applyOpen} onClose={() => setApplyOpen(false)} onDone={(id) => { setApplyOpen(false); toast(`Application #${id} submitted`, 'success'); refresh() }} />
    </div>
  )
}

function Summary({ s }) {
  if (!s) return null
  const d = {
    assessed: Number(s.assessed || 0),
    paid: Number(s.paid || 0),
    dues: Number(s.dues || 0),
    pct: Number(s.paid_pct || 0),
  }
  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat label="Assessed" value={d.assessed} tone="text-zinc-900 dark:text-zinc-50" />
          <Stat label="Paid to date" value={d.paid} tone="text-emerald-600 dark:text-emerald-400" />
          <Stat label="Due" value={d.dues} tone={d.dues > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Stat label="Cleared" value={d.pct && `${d.pct}%` || '0%'} tone="text-brand-600 dark:text-brand-400" bar={d.pct} />
        </div>
        <div className="mt-5">
          <Progress value={d.pct} tone={d.dues === 0 ? 'green' : 'brand'} />
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Clock3 className="h-3 w-3" aria-hidden />
            {d.dues === 0 ? 'All fees cleared — nothing pending.' : 'Pay at the accounts counter; receipts appear right away.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, tone, bar }) {
  return (
    <div>
      <p className={`text-2xl font-bold tracking-tight ${tone}`}>{typeof value === 'number' ? money(value) : value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      {bar !== undefined && <Progress value={bar} className="mt-2" tone={bar >= 100 ? 'green' : 'brand'} />}
    </div>
  )
}

function Receipts({ data }) {
  const rows = data?.data?.receipts || []
  if (data?.error) return <ErrorState message={data.error} onRetry={data.reload} />
  if (!data?.loading && rows.length === 0)
    return <EmptyState icon={Receipt} title="No receipts yet" description="Payments recorded by the accounts desk will show up here." />
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id || i} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.purpose || r.description || 'Fee payment'}</p>
            <p className="text-[11px] text-zinc-400">
              {r.receipt_number || r.receipt_no ? `${r.receipt_number || r.receipt_no} · ` : ''}{fmtDate(r.paid_on || r.created_at || r.date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{money(r.amount)}</p>
            <p className="text-[11px] text-zinc-400">{(r.method || r.payment_method || 'cash').replace('_', ' ')}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function MyScholarships({ data, onApply }) {
  const rows = data?.data?.items || data?.data || []
  const list = Array.isArray(rows) ? rows : []
  if (data?.error && String(data.error).includes('401')) return <ErrorState message={data.error} />
  if (data?.loading) return <Spinner className="py-8" />
  if (list.length === 0)
    return (
      <EmptyState
        icon={GraduationCap}
        title="No applications yet"
        description="Merit and need-based schemes are added by the office — you can apply for any by name."
        action={<Button size="sm" variant="subtle" onClick={onApply}>Apply now</Button>}
      />
    )
  return (
    <ul className="space-y-2">
      {list.map((s, i) => (
        <li key={s.id || i} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.name}</p>
            <p className="text-[11px] text-zinc-400">Applied {fmtDate(s.awarded_on || s.created_at || s.applied_at)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{money(s.amount)}</p>
            <Badge tone={statusTone(s.status || '')}>{s.status}</Badge>
          </div>
        </li>
      ))}
    </ul>
  )
}

const SCHEMES = [
  'Merit Scholarship (CGPA above 9.0)',
  'Merit cum Means Scholarship',
  'Sibling Concession',
  'Sports Scholarship',
  'SC/ST Fee Waiver',
  'Private scheme (state board)',
]

function ApplyDialog({ open, onClose, onDone }) {
  return (
    <ScholarshipApply
      open={open}
      onClose={onClose}
      onDone={onDone}
    />
  )
}

function ScholarshipApply({ open, onClose, onDone }) {
  const [name, setName] = useState(SCHEMES[0])
  const [custom, setCustom] = useState('')
  const [amount, setAmount] = useState('25000')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const finalName = name === '__custom' ? custom.trim() : name

  const submit = async () => {
    if (!finalName || busy) return
    setBusy(true)
    setErr('')
    try {
      const res = await post('/api/fees/scholarships/apply', { name: finalName, amount: Number(amount) || 0 })
      onDone?.(res.id)
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
      title="Apply for a scholarship"
      description="The fee office verifies every application against your CGPA and category."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!finalName || !amount}>Submit application</Button>
        </>
      }
    >
      <div className="space-y-4 pb-4">
        <div>
          <Label htmlFor="sch-scheme" required>Scheme</Label>
          <Select id="sch-scheme" value={name} onChange={(e) => setName(e.target.value)}>
            {SCHEMES.map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option value="__custom">Other…</option>
          </Select>
        </div>
        {name === '__custom' && (
          <div>
            <Label htmlFor="sch-custom" required>Other scheme name</Label>
            <Input id="sch-custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Municipal merit list" />
          </div>
        )}
        <div>
          <Label htmlFor="sch-amount" required>Requested amount (₹)</Label>
          <Input id="sch-amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <FieldError>{err}</FieldError>
      </div>
    </Dialog>
  )
}