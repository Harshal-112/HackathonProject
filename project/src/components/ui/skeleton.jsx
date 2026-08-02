import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton h-4 w-full', className)} {...props} />
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
