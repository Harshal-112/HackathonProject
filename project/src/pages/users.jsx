import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Search, Edit, Trash2, Shield, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, ShieldCheck, AlertTriangle, UserX, BarChart2,
  Clock, Flag, Building2, Activity,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { DEPARTMENTS, ROLES } from '@/lib/mock-data'
import { formatDate, initials, cn } from '@/lib/utils'

const roleColors = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  officer: 'bg-accent/10 text-accent border-accent/20',
  verifier: 'bg-success/10 text-success border-success/20',
  citizen: 'bg-warning/10 text-warning border-warning/20',
}

const riskColors = {
  HIGH: 'text-destructive bg-destructive/10 border-destructive/20',
  MEDIUM: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200',
  LOW: 'text-success bg-success/10 border-success/20',
}

const riskLabels = { HIGH: '🔴 High', MEDIUM: '🟡 Medium', LOW: '🟢 Low' }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [verifierStats, setVerifierStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [suspendProcessing, setSuspendProcessing] = useState(false)
  const [oversightOpen, setOversightOpen] = useState(false)
  const [statsDetailModal, setStatsDetailModal] = useState(null)

  const [form, setForm] = useState({
    name: '', email: '', role: 'citizen', department: 'panchayat',
    designation: '', phone: '', password: '', status: 'active',
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getUsers()
      setUsers(res)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchVerifierStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const stats = await api.getVerifierStats()
      setVerifierStats(stats)
    } catch (err) {
      console.warn('verifier stats error:', err.message)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    if (oversightOpen && verifierStats.length === 0) {
      fetchVerifierStats()
    }
  }, [oversightOpen, verifierStats.length, fetchVerifierStats])

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  )

  const openCreate = () => {
    setEditingUser(null)
    setForm({ name: '', email: '', role: 'citizen', department: 'panchayat', designation: '', phone: '', password: '', status: 'active' })
    setModalOpen(true)
  }

  const openEdit = (u) => {
    setEditingUser(u)
    setForm({ name: u.name, email: u.email, role: u.role, department: u.department, designation: u.designation, phone: u.phone, status: u.status })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, form)
        toast({ title: 'Updated', description: 'User updated successfully', variant: 'success' })
      } else {
        await api.createUser(form)
        toast({ title: 'Created', description: 'User created successfully', variant: 'success' })
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteUser(deleteTarget.id)
      toast({ title: 'Deleted', description: 'User deleted', variant: 'success' })
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const toggleStatus = async (u) => {
    const nextStatus = u.status === 'active' ? 'inactive' : 'active'
    const verb = u.status === 'pending' ? 'approved' : nextStatus === 'active' ? 'activated' : 'deactivated'
    try {
      await api.updateUser(u.id, { status: nextStatus })
      fetchUsers()
      toast({ title: 'Status updated', description: `${u.name} is now ${verb}`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleSuspend = async () => {
    if (!suspendTarget) return
    setSuspendProcessing(true)
    try {
      await api.suspendVerifier(suspendTarget.id, currentUser)
      toast({ title: 'Verifier Suspended', description: `${suspendTarget.name}'s account has been suspended and their session will be terminated immediately.`, variant: 'destructive' })
      setSuspendTarget(null)
      fetchUsers()
      // Refresh verifier stats if oversight panel is open
      if (oversightOpen) fetchVerifierStats()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSuspendProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Create, edit, and manage system users and roles">
        <Button size="sm" onClick={openCreate}>
          <UserPlus className="h-4 w-4" /> Add User
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={users.length} />
        <StatCard label="Active" value={users.filter((u) => u.status === 'active').length} color="text-success" />
        <StatCard label="Pending Approval" value={users.filter((u) => u.status === 'pending').length} color="text-amber-600" />
        <StatCard label="Inactive" value={users.filter((u) => u.status === 'inactive').length} color="text-muted-foreground" />
        <StatCard label="Admins" value={users.filter((u) => u.role === 'admin').length} color="text-primary" />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !filtered.length ? (
            <EmptyState icon={Users} title="No users found" description="Try a different search or add a new user" />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Role</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Department</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Last Login</th>
                    <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-accent/30"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar>{initials(u.name)}</Avatar>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn('capitalize', roleColors[u.role])}>
                          <Shield className="h-3 w-3" /> {u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{DEPARTMENTS.find((d) => d.id === u.department)?.name || u.department}</div>
                        {u.role === 'verifier' && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Assigned dept
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {u.status === 'pending' ? (
                          <button onClick={() => openEdit(u)} title="Click to review and activate this verifier">
                            <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                              <ShieldCheck className="h-3 w-3" /> Pending
                            </Badge>
                          </button>
                        ) : (
                          <button onClick={() => toggleStatus(u)}>
                            <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                              {u.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {u.status}
                            </Badge>
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="rounded-md p-1.5 hover:bg-muted" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          {/* Suspend button — only for active verifiers */}
                          {u.role === 'verifier' && u.status === 'active' && u.id !== currentUser?.id && (
                            <button
                              onClick={() => setSuspendTarget(u)}
                              className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"
                              title="Suspend verifier"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          )}
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          Verifier Oversight Panel (Admin only)
         ================================================================ */}
      <Card>
        <button
          className="w-full flex items-center justify-between p-4 text-left"
          onClick={() => setOversightOpen((v) => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Verifier Oversight Panel</p>
              <p className="text-xs text-muted-foreground">
                Activity metrics, risk indicators, and workload per verifier
              </p>
            </div>
          </div>
          {oversightOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {oversightOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t">
                {statsLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : verifierStats.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No verifiers found. Verifiers who self-register will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Verifier</th>
                          <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Dept</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Pending</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Approved</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Rejected</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Overdue</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Re-verif Flags</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Approval Rate</th>
                          <th className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">Risk Indicator</th>
                          <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifierStats.map((v) => (
                          <tr key={v.id} className="border-t hover:bg-accent/20">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-sm">{v.name}</p>
                                <Badge
                                  variant={v.status === 'active' ? 'success' : 'secondary'}
                                  className="text-[10px] mt-0.5"
                                >
                                  {v.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {DEPARTMENTS.find((d) => d.id === v.department)?.code || v.department}
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn('font-semibold', v.pendingAssigned > 0 ? 'text-warning' : 'text-muted-foreground')}>
                                {v.pendingAssigned}
                              </span>
                            </td>
                            <td className="p-3 text-center font-medium text-success">{v.approved}</td>
                            <td className="p-3 text-center font-medium text-destructive">{v.rejected}</td>
                            <td className="p-3 text-center">
                              <span className={cn('font-semibold', v.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                                {v.overdueCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={cn('font-semibold', v.reFlagCount > 0 ? 'text-violet-600' : 'text-muted-foreground')}>
                                {v.reFlagCount}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {v.approvalRate !== null ? (
                                <span className={cn('font-semibold', v.approvalRate > 90 ? 'text-amber-600' : 'text-foreground')}>
                                  {v.approvalRate}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                variant="outline"
                                className={cn('text-xs font-semibold', riskColors[v.riskLevel])}
                              >
                                {riskLabels[v.riskLevel]}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              {v.status === 'active' && (
                                <button
                                  onClick={() => setSuspendTarget(users.find((u) => u.id === v.id))}
                                  className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 font-medium"
                                >
                                  Suspend
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Risk Indicator</span>: 🔴 High — approval rate &gt;95% with 20+ decisions (no pushback may signal rubber-stamping) · 🟡 Medium — &gt;90% with 10+ · 🟢 Low. This is an indicator only; human review is required to determine actual misconduct.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit User' : 'Create New User'}
        description={editingUser ? `Editing ${editingUser.name}` : 'Add a new user to the system'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" placeholder="John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" placeholder="name@gov.in" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role</Label>
              <Select value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={ROLES.map((r) => ({ value: r.id, label: r.name }))} className="mt-1.5" />
            </div>
            <div>
              <Label>
                {form.role === 'verifier' ? 'Assigned Department' : 'Department'}
              </Label>
              <Select
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
                options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                className="mt-1.5"
              />
              {form.role === 'verifier' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-start gap-1">
                  <Building2 className="h-3 w-3 mt-0.5 shrink-0" />
                  This department determines which documents this verifier sees and can approve. Only an admin can change it.
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Designation</Label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="mt-1.5" placeholder="Revenue Officer" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" placeholder="+91 98765 43210" />
            </div>
          </div>
          {/* When activating a pending verifier, show department confirmation */}
          {editingUser?.status === 'pending' && editingUser?.role === 'verifier' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">Confirm Department Before Activating</p>
                  <p>
                    This verifier requested: <strong>{DEPARTMENTS.find((d) => d.id === editingUser.department)?.name || editingUser.department}</strong>.
                    You can change the department above before setting status to Active.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
                className="mt-1.5"
              />
            </div>
          </div>
          {!editingUser && (
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" placeholder="Default@123" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingUser ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete User" description="This action cannot be undone.">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title="Suspend Verifier Account"
        description={`${suspendTarget?.name} · ${DEPARTMENTS.find((d) => d.id === suspendTarget?.department)?.name || ''}`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive">
              <p className="font-semibold">This will immediately:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-destructive/80">
                <li>Terminate any active login session for this verifier</li>
                <li>Prevent future approvals/rejections from this account</li>
                <li>Remove their documents from the approval queue</li>
              </ul>
              <p className="mt-2">You can reactivate the account at any time from the Users table.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSuspendTarget(null)} disabled={suspendProcessing}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={suspendProcessing}>
              {suspendProcessing ? 'Suspending...' : 'Suspend Verifier'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ label, value, color = 'text-foreground' }) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <p className={cn('text-2xl font-bold', color)}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  )
}
