import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ScrollText, Search, Filter, Download, FileSpreadsheet, User, Clock,
  Monitor, FileText, LogIn, LogOut, Upload, Download as DownloadIcon,
  CheckCircle2, XCircle, Edit, Trash2,
} from 'lucide-react'
import { mockApi } from '@/lib/mock-api'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime, toCSV, downloadFile, cn } from '@/lib/utils'

const actionIcons = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  UPLOAD: Upload,
  DOWNLOAD: DownloadIcon,
  DELETE: Trash2,
  APPROVE: CheckCircle2,
  REJECT: XCircle,
  METADATA_CHANGE: Edit,
  SEARCH: Search,
}

const actionVariants = {
  LOGIN: 'success',
  LOGOUT: 'secondary',
  UPLOAD: 'default',
  DOWNLOAD: 'default',
  DELETE: 'destructive',
  APPROVE: 'success',
  REJECT: 'destructive',
  METADATA_CHANGE: 'warning',
  SEARCH: 'secondary',
}

const ACTIONS = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'UPLOAD', label: 'Upload' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'METADATA_CHANGE', label: 'Metadata Change' },
  { value: 'SEARCH', label: 'Search' },
]

export default function AuditTrailPage() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', action: '' })
  const [showFilters, setShowFilters] = useState(false)
  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await mockApi.getAuditLogs({ ...filters, page, pageSize })
      setData(res)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filters, page, toast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExport = () => {
    if (!data) return
    const rows = data.items.map((l) => ({
      Timestamp: formatDateTime(l.timestamp),
      User: l.userName,
      Role: l.userRole,
      Action: l.action,
      Description: l.description,
      Document: l.documentTitle || '',
      IPAddress: l.ipAddress,
      UserAgent: l.userAgent,
    }))
    downloadFile(`audit_logs_${Date.now()}.csv`, toCSV(rows))
    toast({ title: 'Exported', description: 'Audit logs exported to CSV', variant: 'success' })
  }

  const hasFilters = filters.search || filters.action

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Complete activity log of all actions performed in the system"
      >
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileSpreadsheet className="h-4 w-4" /> Export Logs
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or description..."
                value={filters.search}
                onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1) }}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" /> Filter by Action
            </Button>
          </div>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <Select
                value={filters.action}
                onChange={(v) => { setFilters({ ...filters, action: v }); setPage(1) }}
                options={ACTIONS}
                placeholder="All Actions"
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={10} cols={6} /></div>
          ) : !data?.items?.length ? (
            <EmptyState
              icon={ScrollText}
              title="No audit logs found"
              description={hasFilters ? "Try adjusting your filters" : "No activity has been logged yet"}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Time</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">User</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Action</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Document</th>
                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log, i) => {
                    const Icon = actionIcons[log.action] || ScrollText
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                      >
                        <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.userName}</p>
                              <p className="text-xs text-muted-foreground capitalize">{log.userRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', `text-${actionVariants[log.action] === 'destructive' ? 'destructive' : actionVariants[log.action] === 'success' ? 'success' : 'muted-foreground'}`)} />
                            <Badge variant={actionVariants[log.action] || 'secondary'}>{log.action}</Badge>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{log.description}</td>
                        <td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{log.documentTitle || '—'}</td>
                        <td className="p-3 text-sm text-muted-foreground font-mono text-xs">{log.ipAddress}</td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm font-medium">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
