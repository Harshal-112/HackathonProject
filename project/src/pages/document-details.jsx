import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, FileText, Download, Edit, Trash2, Clock, User, Building2,
  Calendar, Languages, ScanText, Brain, Tag, MapPin, FolderTree,
  Percent, FileSignature, History, Save, X, MessageSquare,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, ErrorState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/shared/badges'
import { Modal } from '@/components/ui/modal'
import { DEPARTMENTS, CATEGORIES, PRIORITIES } from '@/lib/mock-data'
import { formatDate, formatDateTime, formatBytes, timeAgo, cn } from '@/lib/utils'

export default function DocumentDetailsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [editForm, setEditForm] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    mockApi.getDocument(id)
      .then((d) => {
        setDoc(d)
        setEditForm({
          title: d.title,
          department: d.department,
          category: d.category,
          priority: d.priority,
        })
        setLoading(false)
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [id])

  const handleSave = async () => {
    try {
      const updated = await mockApi.updateDocument(doc.id, editForm, user)
      setDoc(updated)
      setEditing(false)
      toast({ title: 'Updated', description: 'Document metadata updated', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await mockApi.deleteDocument(doc.id, user)
      toast({ title: 'Deleted', description: 'Document deleted', variant: 'success' })
      navigate('/documents')
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>
  if (error) return <ErrorState message={error} onRetry={() => navigate('/documents')} />

  const deptName = DEPARTMENTS.find((d) => d.id === doc.department)?.name || doc.department
  const catName = CATEGORIES.find((c) => c.id === doc.category)?.name || doc.category

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/documents" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Documents
        </Link>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="text-lg font-semibold"
                    />
                  ) : (
                    <h1 className="text-xl font-bold">{doc.title}</h1>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{doc.documentNumber}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={doc.status} />
                    <PriorityBadge priority={doc.priority} />
                    <CategoryBadge category={doc.category} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit form or metadata */}
          {editing ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Edit Metadata</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Department</Label>
                  <Select
                    value={editForm.department}
                    onChange={(v) => setEditForm({ ...editForm, department: v })}
                    options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editForm.category}
                    onChange={(v) => setEditForm({ ...editForm, category: v })}
                    options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editForm.priority}
                    onChange={(v) => setEditForm({ ...editForm, priority: v })}
                    options={PRIORITIES.map((p) => ({ value: p.id, label: p.name }))}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* AI Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" /> AI-Extracted Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                    <p className="text-sm">
                      {doc.metadata?.organization}
                      {doc.metadata?.subject &&
                          ` • ${doc.metadata.subject}`}
                      {doc.metadata?.post &&
                          ` • ${doc.metadata.post}`}
                  </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <MetaItem
                          icon={Building2}
                          label="Organization"
                          value={doc.metadata?.organization}
                      />
                      <MetaItem
                          icon={FileText}
                          label="Subject"
                          value={doc.metadata?.subject}
                      />
                      <MetaItem
                          icon={User}
                          label="Post"
                          value={doc.metadata?.post}
                      />
                      <MetaItem
                          icon={FileSignature}
                          label="Document Number"
                          value={doc.metadata?.documentNumber}
                      />
                      <MetaItem
                          icon={Tag}
                          label="Keywords"
                          value={
                              doc.metadata?.keywords?.join(", ")
                          }
                      />
                      <MetaItem
                          icon={Languages}
                          label="Language"
                          value={doc.language}
                      />
                      <MetaItem
                          icon={Percent}
                          label="OCR Confidence"
                          value={`${doc.ocrConfidence}%`}
                      />
                  </div>
                  {doc.metadata?.importantDates?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Important Dates</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.metadata.importantDates.map((d, i) => (
                          <Badge key={i} variant="outline">{formatDate(d)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* OCR Text */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ScanText className="h-4 w-4 text-primary" /> OCR Extracted Text
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4 max-h-80 overflow-y-auto scrollbar-thin">
                    <pre className="text-sm whitespace-pre-wrap font-mono">{doc.ocrText}</pre>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    OCR Confidence: <span className="font-medium text-success">{doc.ocrConfidence}%</span>
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Version history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doc.versions.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      v{v.version}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{v.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.uploadedBy} • {formatDateTime(v.uploadedAt)} • {formatBytes(v.fileSize)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Document Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={FileText} label="File Name" value={doc.fileName} />
              <InfoRow icon={Building2} label="Organization" value={doc.metadata?.organization} />
              <InfoRow icon={FileSignature} label="Document Number" value={doc.metadata?.documentNumber} />
              <InfoRow icon={Calendar} label="Uploaded" value={formatDate(doc.createdAt)} />
              <InfoRow icon={Clock} label="Last Updated" value={timeAgo(doc.updatedAt)} />
              <InfoRow icon={User} label="Uploaded By" value={doc.uploadedByName} />
              <InfoRow icon={FileText} label="File Type" value={doc.fileType.toUpperCase()} />
              <InfoRow icon={FileText} label="File Size" value={formatBytes(doc.fileSize)} />
              <InfoRow icon={FileText} label="Pages" value={doc.pageCount} />
              <InfoRow icon={Languages} label="Language" value={doc.language} />
            </CardContent>
          </Card>

          {/* Approval timeline */}
          {doc.approvals?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" /> Approval Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doc.approvals.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                        a.action === 'approved' ? 'bg-success/10 text-success' :
                        a.action === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                      )}>
                        {a.action === 'approved' ? '✓' : a.action === 'rejected' ? '✕' : '↻'}
                      </div>
                      <div className="flex-1 pb-3 border-b last:border-0">
                        <p className="text-sm font-medium capitalize">{a.action.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{a.userName} • {formatDateTime(a.timestamp)}</p>
                        {a.comment && <p className="text-xs mt-1 text-muted-foreground">"{a.comment}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Document" description="This action cannot be undone.">
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <span className="font-medium text-foreground">{doc.title}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>

      <p className="text-sm">
        {value || "—"}
      </p>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" /> {label}
      </div>
      <p className="text-sm font-medium text-right truncate max-w-[180px]">{value}</p>
    </div>
  )
}
