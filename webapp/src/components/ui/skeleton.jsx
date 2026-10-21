import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800', className)} {...props} />
}

export function BadgeSkeleton({ className }) {
  return <Skeleton className={cn('h-5 w-16', className)} />
}