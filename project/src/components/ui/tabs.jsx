import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext(null)

export function Tabs({ defaultValue, children, className }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div className={cn('inline-flex flex-wrap items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground gap-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }) {
  const { value: current, setValue } = useContext(TabsContext)
  return (
    <button
      onClick={() => setValue(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        current === value ? 'bg-background text-foreground shadow-sm' : 'hover:bg-background/50',
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children }) {
  const { value: current } = useContext(TabsContext)
  if (current !== value) return null
  return <div className="mt-4" style={{ animation: 'fadeIn 0.2s ease' }}>{children}</div>
}
