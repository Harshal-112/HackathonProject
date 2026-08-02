import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { mockApi } from './mock-api.js'

const AuthContext = createContext(null)

const SESSION_KEY = 'sdds_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { user: u, token } = await mockApi.login(email, password)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    localStorage.setItem('sdds_token', token)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (data) => {
    const { user: u, token } = await mockApi.register(data)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    localStorage.setItem('sdds_token', token)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('sdds_token')
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => {
    setUser(updated)
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  }, [])

  const value = { user, loading, login, register, logout, updateUser }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
