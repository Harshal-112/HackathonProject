import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Landmark, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, User, Phone,
  Building2, Shield, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DEPARTMENTS, ROLES } from '@/lib/mock-data'

export default function RegisterPage() {
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'citizen',
    department: 'panchayat',
    designation: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (!/^[+]?[\d\s-]{10,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number'
    if (!form.designation.trim()) e.designation = 'Designation is required'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(form.password))
      e.password = 'Password must include a letter, a number, and a special character'
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { confirmPassword, ...data } = form
      const user = await register(data)
      toast({ title: 'Account created', description: `Welcome, ${user.name}! You are now logged in.`, variant: 'success' })
      navigate('/dashboard')
    } catch (err) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <div className="flex" style={{ minHeight: '100dvh' }}>
      {/* Left panel */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 h-40 w-40 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 right-10 h-60 w-60 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/3 h-32 w-32 rounded-full border border-white" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Landmark className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold">SDDS</h1>
              <p className="text-xs opacity-80">Government of Maharashtra</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-serif text-4xl font-bold leading-tight">
              Create Your<br />Government Account
            </h2>
            <p className="text-lg opacity-90 max-w-md">
              Register to access the Smart Digital Documentation System. All accounts are verified and role-based.
            </p>
            <div className="space-y-3 max-w-md">
              <Step n={1} text="Fill in your personal and official details" />
              <Step n={2} text="Choose your role and department" />
              <Step n={3} text="Set a strong password and start using the system" />
            </div>
          </div>

          <p className="text-xs opacity-70">© 2026 Government of Maharashtra. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - Register form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md my-8"
        >
          <div className="md:hidden mb-8 flex items-center gap-3 justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold">SDDS</h1>
              <p className="text-xs text-muted-foreground">Govt. Documentation</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">Create Account</h2>
          <p className="text-sm text-muted-foreground mb-6">Register to get started with the documentation system</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Rajesh Kumar Sharma"
                  className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="name@gov.in"
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={form.role}
                  onChange={(v) => setField('role', v)}
                  options={ROLES.filter((r) => r.id !== 'admin').map((r) => ({ value: r.id, label: r.name }))}
                  className="mt-1.5"
                />
                {form.role === 'verifier' && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Verifier accounts need admin approval before you can log in.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  id="department"
                  value={form.department}
                  onChange={(v) => setField('department', v)}
                  options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="designation">Designation</Label>
              <div className="relative mt-1.5">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="designation"
                  value={form.designation}
                  onChange={(e) => setField('designation', e.target.value)}
                  placeholder="Revenue Officer"
                  className={`pl-10 ${errors.designation ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.designation && <p className="text-xs text-destructive mt-1">{errors.designation}</p>}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Min 8 chars, 1 letter, 1 number, 1 special"
                  className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to the government data protection policy. Your information will be used only for official documentation purposes.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Creating account...
                </span>
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function Step({ n, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 shrink-0">
        <span className="text-sm font-bold">{n}</span>
      </div>
      <p className="text-sm opacity-90">{text}</p>
    </div>
  )
}
