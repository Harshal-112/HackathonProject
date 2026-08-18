import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Phone, Building2, Shield, Calendar, Edit, Save, X,
  CheckCircle2, FileText, Clock, Activity,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DEPARTMENTS, ROLES } from '@/lib/mock-data'
import { initials, formatDate, formatDateTime, cn } from '@/lib/utils'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    designation: user?.designation || '',
  })

  const handleSave = async () => {
    try {
      const updated = await api.updateUser(user.id, form)
      updateUser(updated)
      setEditing(false)
      toast({ title: 'Profile updated', description: 'Your profile has been saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const deptName = DEPARTMENTS.find((d) => d.id === user?.department)?.name || user?.department
  const roleName = ROLES.find((r) => r.id === user?.role)?.name || user?.role

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="View and manage your account information" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto text-2xl">{initials(user?.name)}</Avatar>
              <h2 className="text-lg font-bold mt-4">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.designation}</p>
              <div className="mt-3 flex justify-center">
                <Badge variant="outline" className="capitalize">
                  <Shield className="h-3 w-3" /> {roleName}
                </Badge>
              </div>
              <div className="mt-6 space-y-3 text-left">
                <InfoRow icon={Mail} label="Email" value={user?.email} />
                <InfoRow icon={Phone} label="Phone" value={user?.phone || '—'} />
                <InfoRow icon={Building2} label="Department" value={deptName} />
                <InfoRow icon={Calendar} label="Member Since" value={formatDate(user?.createdAt)} />
                <InfoRow icon={Clock} label="Last Login" value={user?.lastLogin ? formatDateTime(user.lastLogin) : '—'} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </span>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  {editing ? (
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="text-sm mt-1.5 font-medium">{user?.name}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  {editing ? (
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="text-sm mt-1.5 font-medium">{user?.email}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  {editing ? (
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="text-sm mt-1.5 font-medium">{user?.phone || '—'}</p>
                  )}
                </div>
                <div>
                  <Label>Designation</Label>
                  {editing ? (
                    <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="text-sm mt-1.5 font-medium">{user?.designation}</p>
                  )}
                </div>
              </div>
              <div>
                <Label>Department</Label>
                {editing ? (
                  <Select
                    value={form.department}
                    onChange={(v) => setForm({ ...form, department: v })}
                    options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                    className="mt-1.5"
                  />
                ) : (
                  <p className="text-sm mt-1.5 font-medium">{deptName}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <ActivityCard icon={FileText} label="Documents" value="—" color="text-primary" bg="bg-primary/10" />
                <ActivityCard icon={CheckCircle2} label="Approvals" value="—" color="text-success" bg="bg-success/10" />
                <ActivityCard icon={Clock} label="Last Active" value={user?.lastLogin ? timeAgo(user.lastLogin) : '—'} color="text-accent" bg="bg-accent/10" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function ActivityCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function timeAgo(date) {
  const d = new Date(date)
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
