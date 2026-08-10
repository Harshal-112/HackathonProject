import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Bell, Sun, Moon, Search, LogOut, User, Settings, ChevronDown,
  ShieldCheck, ShieldOff, CheckCheck, Upload, CheckCircle2, XCircle, RefreshCw, Info,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useToast } from '@/lib/toast-context'
import { usePrivacy } from '@/lib/privacy-context'
import { mockApi } from '@/lib/mock-api'
import { cn, initials, timeAgo } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

const routeNames = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Documents',
  '/documents': 'Document List',
  '/search': 'Smart Search',
  '/approvals': 'Approval Dashboard',
  '/audit': 'Audit Trail',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings',
  '/profile': 'My Profile',
}

const NOTIF_TYPE_ICONS = {
  upload: { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  approval: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' },
  changes: { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  info: { icon: Info, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/30' },
}

export function Navbar({ onMenuClick, notifications = [], onNotificationsChange, unreadCount = 0 }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const { confidentialMode, toggle: togglePrivacy } = usePrivacy()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    toast({ title: 'Logged out', description: 'You have been logged out successfully' })
    navigate('/login')
  }

  const markAllRead = async () => {
    const updated = await mockApi.markAllNotificationsRead()
    onNotificationsChange?.(updated)
  }

  const markOneRead = async (id) => {
    try {
      await mockApi.markNotificationRead(id)
      onNotificationsChange?.(notifications.map((n) => n.id === id ? { ...n, read: true } : n))
    } catch (_) {}
  }

  const currentRoute = routeNames[location.pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border glass px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <h2 className="text-lg font-semibold">{currentRoute}</h2>
          <p className="text-xs text-muted-foreground">
            Government of Maharashtra / Digital Documentation
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => navigate('/search')}
          className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors w-48"
        >
          <Search className="h-4 w-4" />
          <span>Search documents...</span>
        </button>

        {/* End-to-End Encrypted Mode Toggle */}
        <button
          onClick={() => {
            togglePrivacy()
            toast({
              title: confidentialMode ? '⚡ Normal Mode Activated' : '🔒 End-to-End Encrypted Mode',
              description: confidentialMode
                ? 'AI-enhanced analysis is now enabled. PII is auto-masked before any external call.'
                : 'All AI calls disabled. Processing 100% locally in your browser. Zero data leaves this device.',
            })
          }}
          title={confidentialMode ? 'Switch to Normal Mode' : 'Switch to End-to-End Encrypted Mode'}
          className={cn(
            'hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border',
            confidentialMode
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
          )}
        >
          {confidentialMode
            ? <><ShieldCheck className="h-3.5 w-3.5" /> E2E Encrypted</>  
            : <><ShieldOff className="h-3.5 w-3.5" /> Normal Mode</>}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-96 rounded-xl border bg-popover shadow-xl z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => {
                      const cfg = NOTIF_TYPE_ICONS[n.type] || NOTIF_TYPE_ICONS.info
                      const Icon = cfg.icon
                      return (
                        <div
                          key={n.id}
                          onClick={() => !n.read && markOneRead(n.id)}
                          className={cn(
                            'flex gap-3 px-4 py-3 border-b last:border-0 transition-colors cursor-pointer',
                            !n.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/50',
                          )}
                        >
                          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5', cfg.bg)}>
                            <Icon className={cn('h-4 w-4', cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn('text-sm font-medium truncate', !n.read && 'text-primary')}>{n.title}</p>
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="p-3 border-t">
                  <button
                    onClick={() => { setNotifOpen(false); navigate('/notifications') }}
                    className="w-full text-center text-xs text-primary hover:underline py-1"
                  >
                    View all notifications →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg hover:bg-accent transition-colors p-1"
          >
            <Avatar>{initials(user?.name)}</Avatar>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize leading-tight">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-56 rounded-xl border bg-popover shadow-xl z-50"
              >
                <div className="p-3 border-b">
                  <p className="font-medium text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setProfileOpen(false); navigate('/profile') }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" /> My Profile
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/settings') }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
