import { cn } from '@/lib/utils'

export function Select({ value, onChange, options, placeholder = 'Select...', className, ...props }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options?.map((opt) => (
        <option key={opt.value || opt.id} value={opt.value || opt.id}>
          {opt.label || opt.name}
        </option>
      ))}
    </select>
  )
}
