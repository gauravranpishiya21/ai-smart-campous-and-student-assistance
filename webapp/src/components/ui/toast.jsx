import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

const ToastCtx = createContext(null)
const icons = { success: CheckCircle2, error: AlertCircle, info: Info }
const tones = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-brand-600 dark:text-brand-400',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message, kind = 'info') => {
      const id = Math.random().toString(36).slice(2)
      setToasts((ts) => [...ts, { id, message, kind }])
      setTimeout(() => remove(id), 3500)
    },
    [remove]
  )

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.kind] || icons.info
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-overlay animate-fade-in',
                'dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-dark-card'
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 h-4 w-4 shrink-0', tones[t.kind])} aria-hidden />
              <p className="flex-1 text-xs font-medium text-zinc-700 dark:text-zinc-200">{t.message}</p>
              <button onClick={() => remove(t.id)} aria-label="Dismiss notification" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)