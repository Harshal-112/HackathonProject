import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import FloatingChatbot from './floating-chatbot'
import { api } from '@/lib/api'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications()
      setNotifications(data)
    } catch (_) {}
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} unreadCount={unreadCount} />
      <div className="lg:pl-72">
        <Navbar
          onMenuClick={() => setSidebarOpen(true)}
          notifications={notifications}
          onNotificationsChange={setNotifications}
          unreadCount={unreadCount}
        />
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      <FloatingChatbot />
    </div>
  )
}
