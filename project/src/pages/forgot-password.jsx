import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw new Error(error.message)
      setSent(true)
    } catch (err) {
      const msg = (typeof err === 'string' ? err : err?.message || err?.msg || '').toString()
      toast({
        title: 'Unable to Send Reset Email',
        description: msg && msg !== '[object Object]'
          ? msg
          : 'Supabase failed to send the email. If Custom SMTP is enabled in your Supabase Dashboard (Authentication → Emails → SMTP), please turn it OFF or verify your Resend SMTP credentials.',
        variant: 'destructive',
      })
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
          <h1 className="font-serif text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Secure password recovery</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div>
                <p className="font-semibold text-lg">Check your email!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A password reset link has been sent to <span className="font-medium text-foreground">{email}</span>.
                  Click the link in the email to set a new password.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gov.in"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Enter the email you registered with. We'll send a secure reset link.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : <><span>Send Reset Link</span> <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            </form>
          )}
        </div>

        <Link to="/login" className="mt-4 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </motion.div>
    </div>
  )
}
