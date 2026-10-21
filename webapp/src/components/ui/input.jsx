import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400',
        'transition-colors focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-brand-500',
        className
      )}
      {...props}
    />
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
        'transition-colors focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-0',
        'disabled:opacity-60 min-h-[80px]',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500',
        className
      )}
      {...props}
    />
  )
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900',
        'transition-colors focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/40',
        'disabled:opacity-60',
        'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export function Label({ className, children, htmlFor, required }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5', className)}
    >
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  )
}

export function FieldError({ children }) {
  if (!children) return null
  return <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{children}</p>
}