import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

export function Dropdown({ trigger, children, align = 'right', className, menuClass }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="outline-none"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-2 min-w-[180px] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-pop animate-scale-in',
            'dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-dark-card',
            align === 'right' ? 'right-0' : 'left-0',
            menuClass
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({ className, icon: Icon, children, ...props }) {
  return (
    <button
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors',
        'hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden />}
      {children}
    </button>
  )
}

export function MenuLabel({ children }) {
  return <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{children}</div>
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" role="separator" />
}