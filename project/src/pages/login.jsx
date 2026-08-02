import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, FileCheck, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast({ title: 'Welcome back', description: `Logged in as ${user.name}`, variant: 'success' })
      navigate('/dashboard')
    } catch (err) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
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
              Smart Digital<br />Documentation System
            </h2>
            <p className="text-lg opacity-90 max-w-md">
              Secure, AI-powered document management for District Offices, Municipal Corporations, Revenue Departments, RTO, and Gram Panchayats.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <Feature icon={Shield} title="Secure Access" desc="JWT + RBAC protected" />
              <Feature icon={FileCheck} title="OCR + AI" desc="Auto metadata extraction" />
              <Feature icon={Users} title="Multi-Role" desc="4 role-based access" />
              <Feature icon={FileCheck} title="Audit Trail" desc="Complete activity log" />
            </div>
          </div>

          <p className="text-xs opacity-70">© 2026 Government of Maharashtra. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
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

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your government account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs opacity-80">{desc}</p>
      </div>
    </div>
  )
}
