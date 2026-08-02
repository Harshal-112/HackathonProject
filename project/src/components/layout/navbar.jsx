import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Sun, Moon, Search, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useToast } from '@/lib/toast-context'
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

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    mockApi.getNotifications().then(setNotifications)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleLogout = () => {
    logout()
    toast({ title: 'Logged out', description: 'You have been logged out successfully' })
    navigate('/login')
  }

  const markAllRead = async () => {
    await mockApi.markAllNotificationsRead()
    const updated = await mockApi.getNotifications()
    setNotifications(updated)
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
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-2 w-80 rounded-xl border bg-popover shadow-xl z-50"
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn('flex gap-3 p-3 border-b last:border-0 hover:bg-accent/50 transition-colors', !n.read && 'bg-primary/5')}
                      >
                        <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', n.read ? 'bg-muted' : 'bg-primary')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
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
