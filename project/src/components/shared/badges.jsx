import { Badge } from '@/components/ui/badge'
import { DOC_STATUSES, PRIORITIES, CATEGORIES } from '@/lib/mock-data'

export function StatusBadge({ status }) {
  const s = DOC_STATUSES.find((x) => x.id === status)
  if (!s) return <Badge variant="outline">{status}</Badge>
  const variant =
    status === 'approved' ? 'success' :
    status === 'rejected' ? 'destructive' :
    status === 'pending' ? 'warning' :
    status === 'changes' ? 'default' : 'secondary'
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.name}
    </Badge>
  )
}

export function PriorityBadge({ priority }) {
  const p = PRIORITIES.find((x) => x.id === priority)
  if (!p) return null
  return (
    <Badge variant="outline" style={{ color: p.color, borderColor: p.color }}>
      {p.name}
    </Badge>
  )
}

export function CategoryBadge({ category }) {
  const c = CATEGORIES.find((x) => x.id === category)
  if (!c) return <Badge variant="outline">{category}</Badge>
  return (
    <Badge variant="outline" style={{ color: c.color, borderColor: c.color }}>
      {c.name}
    </Badge>
  )
}
