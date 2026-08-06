import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(null)

  // Supabase sends the user back to this page with a recovery token in the URL
  // hash. The onAuthStateChange listener fires with the 'PASSWORD_RECOVERY'
  // event once the token is exchanged, setting an active session.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true)
      } else if (event === 'SIGNED_IN' && session) {
        // Also handles when the hash token auto-signs-in the user
        setSessionReady(true)
      }
    })

    // Check if there's already an active session (e.g. user refreshed page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
      else {
        // Check if there's a hash fragment with access_token (Supabase v2 implicit flow)
        const hash = window.location.hash
        if (!hash.includes('access_token')) {
          setSessionError('Invalid or expired reset link. Please request a new one.')
        }
      }
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are the same.', variant: 'destructive' })
      return
    }
    if (password.length < 6) {
      toast({ title: 'Too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      toast({ title: '✅ Password updated!', description: 'Your password has been reset. Please log in.', variant: 'success' })
      await supabase.auth.signOut()
      navigate('/login')
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
            <Landmark className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong new password</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {sessionError ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{sessionError}</p>
              <Button variant="outline" onClick={() => navigate('/forgot-password')}>
                Request new reset link
              </Button>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Verifying reset link…</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : <><CheckCircle2 className="h-4 w-4 mr-1" /> Update Password</>}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
