import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText, Search, Filter, Download, Eye, Trash2, Edit, ChevronLeft, ChevronRight,
  ArrowUpDown, FileSpreadsheet, MoreHorizontal, X,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { PageHeader, EmptyState } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/shared/badges'
import { Modal } from '@/components/ui/modal'
import { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES } from '@/lib/mock-data'
import { formatDate, formatBytes, toCSV, downloadFile, cn } from '@/lib/utils'

const columns = [
  { key: 'title', label: 'Document Title', sortable: true },
  { key: 'documentNumber', label: 'Doc Number', sortable: true },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'createdAt', label: 'Uploaded', sortable: true },
  { key: 'fileSize', label: 'Size', sortable: true },
]

export default function DocumentListPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [filters, setFilters] = useState({ search: '', department: '', category: '', status: '', priority: '' })
  const [selected, setSelected] = useState(new Set())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const pageSize = 10

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getDocuments({ ...filters, page, pageSize, sortBy, sortDir })
      setData(res)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filters, page, sortBy, sortDir, toast])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ search: '', department: '', category: '', status: '', priority: '' })
    setPage(1)
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data) return
    if (selected.size === data.items.length) setSelected(new Set())
    else setSelected(new Set(data.items.map((d) => d.id)))
  }

  const handleDelete = async () => {
    try {
      await api.deleteDocument(deleteTarget.id, user)
      toast({ title: 'Document deleted', description: deleteTarget.title, variant: 'success' })
      setDeleteTarget(null)
      fetchDocs()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleBulkDelete = async () => {
    for (const id of selected) {
      await api.deleteDocument(id, user)
    }
    toast({ title: 'Documents deleted', description: `${selected.size} documents removed`, variant: 'success' })
    setSelected(new Set())
    fetchDocs()
  }

  const handleExportCSV = () => {
    if (!data) return
    const rows = data.items.map((d) => ({
      Title: d.title,
      DocumentNumber: d.documentNumber,
      Department: DEPARTMENTS.find((x) => x.id === d.department)?.name || d.department,
      Category: CATEGORIES.find((x) => x.id === d.category)?.name || d.category,
      Priority: PRIORITIES.find((x) => x.id === d.priority)?.name || d.priority,
      Status: DOC_STATUSES.find((x) => x.id === d.status)?.name || d.status,
      UploadedBy: d.uploadedByName,
      CreatedAt: formatDate(d.createdAt),
      FileSize: formatBytes(d.fileSize),
    }))
    downloadFile(`documents_export_${Date.now()}.csv`, toCSV(rows))
    toast({ title: 'Export complete', description: 'CSV file downloaded', variant: 'success' })
  }

  const deptName = (id) => DEPARTMENTS.find((d) => d.id === id)?.name || id
  const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || id

  const hasFilters = filters.search || filters.department || filters.category || filters.status || filters.priority

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="View, search, filter, and manage all government documents"
      >
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4" /> Export CSV
        </Button>
        <Button size="sm" onClick={() => navigate('/upload')}>
          Upload New
        </Button>
      </PageHeader>

      {/* Search + Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, document number, or content..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" /> Filters
              {hasFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4" /> Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
              <Select
                value={filters.department}
                onChange={(v) => handleFilterChange('department', v)}
                options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                placeholder="All Departments"
              />
              <Select
                value={filters.category}
                onChange={(v) => handleFilterChange('category', v)}
                options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="All Categories"
              />
              <Select
                value={filters.status}
                onChange={(v) => handleFilterChange('status', v)}
                options={DOC_STATUSES.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="All Statuses"
              />
              <Select
                value={filters.priority}
                onChange={(v) => handleFilterChange('priority', v)}
                options={PRIORITIES.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="All Priorities"
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-lg border bg-primary/5 p-3"
        >
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Deselect</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={8} cols={6} /></div>
          ) : !data?.items?.length ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description={hasFilters ? "Try adjusting your filters" : "Upload your first document to get started"}
              action={<Button size="sm" onClick={() => navigate('/upload')}>Upload Document</Button>}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={data.items.length > 0 && selected.size === data.items.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-input"
                      />
                    </th>
                    {columns.map((col) => (
                      <th key={col.key} className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {col.sortable ? (
                          <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-foreground">
                            {col.label}
                            <ArrowUpDown className={cn('h-3 w-3', sortBy === col.key && 'text-primary')} />
                          </button>
                        ) : col.label}
                      </th>
                    ))}
                    <th className="p-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((doc, i) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="text-sm font-medium hover:text-primary hover:underline text-left truncate max-w-[200px]"
                          >
                            {doc.title}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{doc.documentNumber}</td>
                      <td className="p-3 text-sm">{deptName(doc.department)}</td>
                      <td className="p-3"><CategoryBadge category={doc.category} /></td>
                      <td className="p-3"><PriorityBadge priority={doc.priority} /></td>
                      <td className="p-3"><StatusBadge status={doc.status} /></td>
                      <td className="p-3 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
                      <td className="p-3 text-sm text-muted-foreground">{formatBytes(doc.fileSize)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/documents/${doc.id}`)} className="rounded-md p-1.5 hover:bg-muted" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => navigate(`/documents/${doc.id}?edit=1`)} className="rounded-md p-1.5 hover:bg-muted" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(doc)} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Pagination */}
      {!loading && data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm font-medium">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Document"
        description="This action cannot be undone."
      >
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.title}</span>?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
