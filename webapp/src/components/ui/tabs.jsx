import { useState } from 'react'
import { cn } from '../../lib/utils'

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all',
            value === t.value
              ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}