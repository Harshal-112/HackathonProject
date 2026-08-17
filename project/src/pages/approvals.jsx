import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, RefreshCw, FileText, Clock, MessageSquare,
  FileSignature, User, Calendar, Eye, Building2, AlertTriangle,
  ShieldCheck, Filter,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea, Label, Select } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { StatusBadge, PriorityBadge } from '@/components/shared/badges'
import { DEPARTMENTS } from '@/lib/mock-data'
import { formatDateTime, timeAgo, cn } from '@/lib/utils'
import { isOverdue, sortApprovalsByUrgency } from '@/services/workflowAutomation'

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)
  // Admin-only department filter
  const [deptFilter, setDeptFilter] = useState('all')

  const isAdmin = user?.role === 'admin'
  const isVerifier = user?.role === 'verifier'

  const fetchApprovals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getApprovals(user)
      setDocs(sortApprovalsByUrgency(res))
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const handleAction = async () => {
    if (!actionModal) return
    setProcessing(true)
    try {
      if (actionModal.action === 'approve') {
        await api.approveDocument(actionModal.doc.id, comment, user)
        toast({ title: 'Approved', description: 'Document has been approved', variant: 'success' })
      } else if (actionModal.action === 'reject') {
        await api.rejectDocument(actionModal.doc.id, comment, user)
        toast({ title: 'Rejected', description: 'Document has been rejected', variant: 'destructive' })
      } else if (actionModal.action === 'changes') {
        await api.requestChanges(actionModal.doc.id, comment, user)
        toast({ title: 'Changes requested', description: 'Changes have been requested', variant: 'default' })
      }
      setActionModal(null)
      setComment('')
      fetchApprovals()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const deptName = (id) => DEPARTMENTS.find((d) => d.id === id)?.name || id

  // Admin filter: filter by selected department
  const visibleDocs = isAdmin && deptFilter !== 'all'
    ? docs.filter((d) => d.department === deptFilter)
    : docs

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Approval Monitor' : 'My Approval Queue'}
        description={
          isAdmin
            ? 'Monitor pending approvals across all departments — approval authority belongs to assigned verifiers'
            : `Showing documents assigned to you in ${DEPARTMENTS.find((d) => d.id === user?.department)?.name || 'your department'}`
        }
      >
        <Badge variant="warning">{loading ? '...' : visibleDocs.length} pending</Badge>
      </PageHeader>

      {/* Admin: department filter bar */}
      {isAdmin && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDeptFilter('all')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    deptFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground',
                  )}
                >
                  All Departments
                </button>
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDeptFilter(d.id)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      deptFilter === d.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground',
                    )}
                  >
                    {d.code}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin info banner */}
      {isAdmin && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Monitor mode — </span>
            You have view-only access to pending documents. Approve/Reject/Changes authority belongs exclusively to the assigned verifier. To address a concern, use <span className="font-medium">"Flag for Re-verification"</span> from the Document Details page.
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !visibleDocs.length ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description={
                isAdmin
                  ? 'No pending documents in this department'
                  : 'There are no documents assigned to you right now'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {visibleDocs.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
                          doc.status === 're_verification' ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-warning/10',
                        )}>
                          <FileText className={cn(
                            'h-6 w-6',
                            doc.status === 're_verification' ? 'text-violet-600' : 'text-warning',
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="text-base font-semibold hover:text-primary hover:underline text-left"
                          >
                            {doc.title}
                          </button>
                          <p className="text-sm text-muted-foreground mt-0.5">{doc.documentNumber}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <StatusBadge status={doc.status} />
                            <PriorityBadge priority={doc.priority} />
                            <Badge variant="outline">{deptName(doc.department)}</Badge>
                            {isOverdue(doc) && (
                              <Badge variant="destructive"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {doc.uploadedByName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {formatDateTime(doc.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {timeAgo(doc.createdAt)}
                            </span>
                          </div>

                          {/* Assignment info — shown to verifier and admin */}
                          {doc.assignedVerifierName && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ShieldCheck className="h-3 w-3 text-success" />
                              <span>
                                Assigned to <span className="font-medium text-foreground">{doc.assignedVerifierName}</span>
                                {doc.assignedAt && <> · {timeAgo(doc.assignedAt)}</>}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — verifier only */}
                      {isVerifier ? (
                        <div className="flex items-center gap-2 lg:flex-col lg:justify-center">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => { setActionModal({ doc, action: 'approve' }); setComment('') }}
                            className="flex-1 lg:flex-none"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => { setActionModal({ doc, action: 'reject' }); setComment('') }}
                            className="flex-1 lg:flex-none"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setActionModal({ doc, action: 'changes' }); setComment('') }}
                            className="flex-1 lg:flex-none"
                          >
                            <RefreshCw className="h-4 w-4" /> Changes
                          </Button>
                        </div>
                      ) : (
                        /* Admin: view-only panel */
                        <div className="flex items-center lg:flex-col lg:justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                            <Eye className="h-4 w-4" /> View Details
                          </Button>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/60" />
                            <span className="text-center leading-tight">Awaiting<br />Verifier</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Approval timeline */}
                    {doc.approvals?.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <FileSignature className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground">Approval History</p>
                        </div>
                        <div className="space-y-1">
                          {doc.approvals.map((a, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <span className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                a.action === 'approved' ? 'bg-success'
                                  : a.action === 'rejected' ? 'bg-destructive'
                                  : a.action === 'flagged_for_reverification' ? 'bg-violet-500'
                                  : 'bg-warning',
                              )} />
                              <span className="font-medium capitalize">{a.action.replace(/_/g, ' ')}</span>
                              <span className="text-muted-foreground">by {a.userName}</span>
                              <span className="text-muted-foreground">• {formatDateTime(a.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Action Modal (verifier only) */}
      <Modal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={
          actionModal?.action === 'approve' ? 'Approve Document' :
          actionModal?.action === 'reject' ? 'Reject Document' :
          'Request Changes'
        }
        description={actionModal?.doc?.title}
      >
        <div className="space-y-4">
          <div>
            <Label>Add Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your review comment..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          {/* Digital signature */}
          <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
            <FileSignature className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium">Digital Signature</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {user?.name} • {user?.designation} • {new Date().toLocaleDateString('en-IN')}
            </p>
            <div className="mt-2 font-serif text-lg italic text-muted-foreground">
              {user?.name}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button
              variant={actionModal?.action === 'approve' ? 'success' : actionModal?.action === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? 'Processing...' : actionModal?.action === 'approve' ? 'Approve' : actionModal?.action === 'reject' ? 'Reject' : 'Request Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
