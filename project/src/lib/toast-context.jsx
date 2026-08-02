import { createContext, useContext, useState, useCallback } from 'react'
import { uid } from './utils.js'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((opts) => {
    const id = uid('toast')
    const t = { id, title: opts.title, description: opts.description, variant: opts.variant || 'default' }
    setToasts((prev) => [...prev, t])
    setTimeout(() => dismiss(id), opts.duration || 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-lg border p-4 shadow-lg glass animate-fade-in ${
            t.variant === 'destructive'
              ? 'border-destructive/50 bg-destructive/10'
              : t.variant === 'success'
                ? 'border-success/50 bg-success/10'
                : 'border-border bg-card'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              {t.title && <p className="text-sm font-semibold">{t.title}</p>}
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground text-lg leading-none">
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
