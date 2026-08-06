import { useEffect, useState, useCallback, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCheck, Trash2, Filter, Upload, CheckCircle2,
  XCircle, RefreshCw, Clock, Info, AlertTriangle, Inbox,
  ExternalLink, X,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, timeAgo } from '@/lib/utils'

// -------------------------------------------------------------------
// Notification type config
// -------------------------------------------------------------------
const TYPE_CONFIG = {
  upload: {
    icon: Upload,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    label: 'Upload',
  },
  approval: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
    label: 'Rejected',
  },
  changes: {
    icon: RefreshCw,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    label: 'Changes Needed',
  },
  info: {
    icon: Info,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/30',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    label: 'Warning',
  },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.info
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'upload', label: 'Uploads' },
  { id: 'approval', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'changes', label: 'Changes' },
]

// -------------------------------------------------------------------
// Single Notification Card
// -------------------------------------------------------------------
const NotifCard = forwardRef(({ notif, onRead, onDelete, navigate }, ref) => {
  const cfg = getTypeConfig(notif.type)
  const Icon = cfg.icon

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'group flex gap-4 p-4 rounded-xl border transition-all',
        notif.read
          ? 'bg-card border-border'
          : 'bg-primary/5 border-primary/20 shadow-sm',
      )}
    >
      {/* Icon */}
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.bg)}>
        <Icon className={cn('h-5 w-5', cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn('text-sm font-semibold', !notif.read && 'text-primary')}>
                {notif.title}
              </p>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                {cfg.label}
              </span>
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {!notif.read && (
              <button
                onClick={() => onRead(notif.id)}
                title="Mark as read"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(notif.id)}
              title="Dismiss"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// -------------------------------------------------------------------
// Main Notifications Page
// -------------------------------------------------------------------
export default function NotificationsPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await mockApi.getNotifications()
      setNotifications(data)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
    // Poll every 30s for new notifications
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const handleRead = async (id) => {
    try {
      await mockApi.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await mockApi.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast({ title: 'All marked as read' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await mockApi.deleteNotification(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return
    setDeleting(true)
    try {
      await mockApi.deleteAllNotifications()
      setNotifications([])
      toast({ title: 'All notifications cleared' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.read
    return n.type === activeFilter
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on document approvals, rejections, and system alerts."
      >
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
              <Bell className="h-3 w-3" />
              {unreadCount} unread
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </PageHeader>

      <Card>
        {/* Toolbar */}
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {FILTERS.map((f) => {
                const count = f.id === 'all'
                  ? notifications.length
                  : f.id === 'unread'
                    ? unreadCount
                    : notifications.filter((n) => n.type === f.id).length
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      activeFilter === f.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {f.label} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                  </button>
                )
              })}
            </div>

            {/* Bulk actions */}
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleDeleteAll}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-muted-foreground">
                {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {activeFilter === 'unread'
                  ? "You're all caught up! 🎉"
                  : 'Notifications about document uploads, approvals, and rejections will appear here.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((notif) => (
                  <NotifCard
                    key={notif.id}
                    notif={notif}
                    onRead={handleRead}
                    onDelete={handleDelete}
                    navigate={navigate}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
