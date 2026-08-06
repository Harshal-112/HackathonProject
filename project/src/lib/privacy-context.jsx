import { createContext, useContext, useState, useCallback } from 'react'

const PrivacyContext = createContext(null)

const STORAGE_KEY = 'sdds_confidential_mode'

export function PrivacyProvider({ children }) {
  const [confidentialMode, setConfidentialMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setConfidentialMode((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch (_) {}
      return next
    })
  }, [])

  return (
    <PrivacyContext.Provider value={{ confidentialMode, toggle }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used inside PrivacyProvider')
  return ctx
}
