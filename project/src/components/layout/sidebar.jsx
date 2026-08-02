import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Upload,
  FileText,
  Search,
  CheckCircle,
  ScrollText,
  BarChart3,
  Users,
  Settings,
  User,
  Landmark,
  X,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/search', label: 'Smart Search', icon: Search },
  { to: '/approvals', label: 'Approvals', icon: CheckCircle },
  { to: '/audit', label: 'Audit Trail', icon: ScrollText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'User Management', icon: Users, roles: ['admin'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: User },
]

export function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const location = useLocation()

  const items = navItems.filter((item) => !item.roles || item.roles.includes(user?.role))

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-72 border-r border-border bg-card transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-serif text-base font-bold leading-tight">SDDS</h1>
                <p className="text-[10px] text-muted-foreground leading-tight">Govt. Documentation</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-medium">Secure System</p>
                <p className="text-[10px] text-muted-foreground">RBAC + JWT Protected</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
