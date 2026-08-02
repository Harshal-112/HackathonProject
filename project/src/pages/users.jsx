import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Search, Edit, Trash2, Shield, Mail, Phone, Building2,
  MoreHorizontal, X, CheckCircle2, XCircle,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
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

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    name: '', email: '', role: 'citizen', department: 'panchayat',
    designation: '', phone: '', password: '', status: 'active',
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mockApi.getUsers()
      setUsers(res)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

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
        await mockApi.updateUser(editingUser.id, form)
        toast({ title: 'Updated', description: 'User updated successfully', variant: 'success' })
      } else {
        await mockApi.createUser(form)
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
      await mockApi.deleteUser(deleteTarget.id)
      toast({ title: 'Deleted', description: 'User deleted', variant: 'success' })
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const toggleStatus = async (u) => {
    try {
      await mockApi.updateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' })
      fetchUsers()
      toast({ title: 'Status updated', description: `${u.name} is now ${u.status === 'active' ? 'deactivated' : 'activated'}`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} />
        <StatCard label="Active" value={users.filter((u) => u.status === 'active').length} color="text-success" />
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
                      <td className="p-3 text-sm">{DEPARTMENTS.find((d) => d.id === u.department)?.name || u.department}</td>
                      <td className="p-3">
                        <button onClick={() => toggleStatus(u)}>
                          <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                            {u.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {u.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} className="rounded-md p-1.5 hover:bg-muted" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => setDeleteTarget(u)} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive" title="Delete">
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
              <Label>Department</Label>
              <Select value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))} className="mt-1.5" />
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
