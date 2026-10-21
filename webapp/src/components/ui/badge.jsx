import { cn } from '../../lib/utils'

const tones = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  indigo: 'bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20',
}

export function Badge({ tone = 'neutral', className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        'ring-zinc-500/10',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export const statusTone = (status = '') => {
  const s = status.toLowerCase()
  if (['issued', 'approved', 'paid', 'completed', 'passed', 'resolved', 'present', 'ok', 'active', 'graded', 'returned'].some((k) => s.includes(k))) return 'green'
  if (['rejected', 'failed', 'overdue', 'absent', 'backlog', 'cancelled', 'canceled'].some((k) => s.includes(k))) return 'red'
  if (['pending', 'requested', 'in_progress', 'in-progress', 'submitted', 'reserved', 'scheduled', 'open', 'assigned', 'in_review', 'borrowed'].some((k) => s.includes(k))) return 'amber'
  return 'neutral'
}