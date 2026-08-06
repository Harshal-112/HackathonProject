import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import {
  Landmark, ShieldCheck, CheckCircle2, XCircle, Clock, FileText,
  Building2, Calendar, Hash, Download, ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEPARTMENTS, CATEGORIES } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'

function toDoc(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    category: row.category,
    department: row.department,
    priority: row.priority,
    documentNumber: row.document_number,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pageCount: row.page_count,
    language: row.language,
    approvals: row.approvals || [],
  }
}

const STATUS_CONFIG = {
  approved: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'Document Verified & Approved',
    seal: '✅',
  },
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Document Pending Verification',
    seal: '⏳',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    label: 'Document Rejected',
    seal: '❌',
  },
  changes: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'Changes Requested',
    seal: '🔄',
  },
}

export default function VerifyPage() {
  const { id } = useParams()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const qrRef = useRef(null)

  const verifyUrl = `${window.location.origin}/verify/${id}`

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data) throw new Error('Document not found.')
        setDoc(toDoc(data))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `verify-${doc?.documentNumber || id}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deptName = doc ? (DEPARTMENTS.find((d) => d.id === doc.department)?.name || doc.department) : ''
  const catName = doc ? (CATEGORIES.find((c) => c.id === doc.category)?.name || doc.category) : ''
  const status = doc ? (STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending) : null
  const lastApproval = doc?.approvals?.filter((a) => a.action === 'approved').pop()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying document…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <XCircle className="h-14 w-14 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Verification Failed</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Link to="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  const StatusIcon = status.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Government of Maharashtra</h1>
            <p className="text-xs text-muted-foreground">Smart Digital Documentation System</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Official Verification Portal
          </div>
        </div>

        {/* Status Banner */}
        <motion.div
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          className={`rounded-xl border-2 p-5 mb-4 ${status.bg} ${status.border}`}
        >
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-8 w-8 ${status.color}`} />
            <div>
              <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Document ID: <span className="font-mono font-semibold">{id}</span>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Document Details */}
          <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Document Details
            </h2>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Document Title</p>
              <p className="font-semibold mt-0.5">{doc.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Document Number
                </p>
                <p className="font-mono text-sm font-medium mt-0.5">{doc.documentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Upload Date
                </p>
                <p className="text-sm mt-0.5">{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Department
                </p>
                <p className="text-sm mt-0.5">{deptName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                <p className="text-sm mt-0.5">{catName}</p>
              </div>
            </div>

            {doc.status === 'approved' && lastApproval && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wide mb-1">
                  ✅ Approved By
                </p>
                <p className="text-sm font-medium">{lastApproval.userName}</p>
                <p className="text-xs text-muted-foreground">{new Date(lastApproval.timestamp).toLocaleString('en-IN')}</p>
                {lastApproval.comment && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{lastApproval.comment}"</p>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Uploaded by: <span className="font-medium text-foreground">{doc.uploadedByName}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last updated: {new Date(doc.updatedAt || doc.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* QR Code Panel */}
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col items-center gap-3">
            <h2 className="font-semibold text-sm self-start flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verification QR
            </h2>
            <div ref={qrRef} className="p-2 rounded-lg border-2 border-primary/20 bg-white">
              <QRCodeSVG
                value={verifyUrl}
                size={150}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Scan to verify this document's authenticity online
            </p>
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadQR}>
              <Download className="h-3.5 w-3.5" /> Download QR
            </Button>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open Verification URL
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-5">
          This is an officially generated verification record from the Smart Digital Documentation System.
          Verified at {new Date().toLocaleString('en-IN')}
        </p>
      </motion.div>
    </div>
  )
}
