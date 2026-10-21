import { useEffect, useRef, useState, createContext, useContext, createElement } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { createPortal } from 'react-dom'

const ctx = createContext(null)

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const el = ref.current?.querySelector('button, input, select, textarea, [tabindex]')
    el?.focus?.()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="presentation">
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-[2px] animate-fade-in-fast"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={cn(
          'relative z-10 w-full sm:rounded-2xl bg-white shadow-overlay animate-scale-in max-h-[90vh] flex flex-col',
          'rounded-t-2xl sm:rounded-t-2xl dark:bg-zinc-900 dark:border dark:border-zinc-800',
          size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-md'
        )}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-2">
          <div>
            {title && <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-2">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}