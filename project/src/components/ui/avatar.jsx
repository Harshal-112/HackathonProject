import { cn } from '@/lib/utils'

export function Avatar({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 items-center justify-center text-primary font-semibold text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
