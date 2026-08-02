import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, Mail, ArrowLeft, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await mockApi.forgotPassword(email)
      setGeneratedOtp(res.otp)
      toast({ title: 'OTP sent', description: `OTP sent to ${email}. Demo OTP: ${res.otp}`, variant: 'success' })
      setStep(2)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otp !== generatedOtp) {
      toast({ title: 'Invalid OTP', description: 'Please enter the correct OTP', variant: 'destructive' })
      return
    }
    setStep(3)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await mockApi.resetPassword(email, otp, newPassword)
      toast({ title: 'Password reset', description: 'Your password has been reset successfully', variant: 'success' })
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
          <h1 className="font-serif text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Secure password recovery</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="4-digit OTP"
                    className="pl-10 text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Demo OTP: {generatedOtp}</p>
              </div>
              <Button type="submit" className="w-full">Verify OTP</Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
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
