import { useState, useEffect } from 'react'
import { Skeleton } from './skeleton'
import { cn } from '../../lib/utils'

export function Spinner({ className }) {
  return (
    <div className={cn('flex items-center justify-center py-14 text-zinc-400', className)} role="status" aria-label="Loading">
      <div className="h-6 w-6 rounded-full border-2 border-zinc-200 border-t-brand-600 animate-spin-slow dark:border-zinc-800 dark:border-t-brand-400" />
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center" role="alert">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
      <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{message || 'Please try again in a moment.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {Icon && (
        <div className="mb-1 rounded-xl bg-zinc-100 p-2.5 dark:bg-zinc-800">
          <Icon className="h-5 w-5 text-zinc-400" aria-hidden />
        </div>
      )}
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
      {description && <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function LoadingRows({ rows = 4, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: null, loading: false, error: err?.message || 'Request failed' }))
    return () => {
      alive = false
    }
  }, [...deps, tick])
  const reload = () => setTick((t) => t + 1)
  return { ...state, reload }
}