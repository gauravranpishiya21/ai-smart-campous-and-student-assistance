import { cn } from '../../lib/utils'

export function Progress({ value = 0, tone = 'brand', className, barClass }) {
  const tones = {
    brand: 'bg-brand-600',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    amber: 'bg-amber-500',
  }
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-500', tones[tone], barClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function RingProgress({ value = 0, size = 64, stroke = 6, className, tone = '#4f46e5' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn(className)} role="img" aria-label={`${pct}% progress`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-zinc-100 dark:stroke-zinc-800" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        stroke={tone}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}