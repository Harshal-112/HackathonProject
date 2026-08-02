import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud, FileText, Image, FileCheck, X, ScanText, Brain,
  CheckCircle2, AlertCircle, Sparkles, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { mockApi } from '@/lib/mock-api'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DEPARTMENTS, CATEGORIES, PRIORITIES } from '@/lib/mock-data'
import { formatBytes, cn } from '@/lib/utils'
import { useOCR } from '@/hooks/useOCR'

const ACCEPTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.docx']
const MAX_SIZE = 10 * 1024 * 1024

const stages = [
  { id: 'uploading', label: 'Uploading file', icon: UploadCloud },
  { id: 'ocr', label: 'Running OCR extraction', icon: ScanText },
  { id: 'ai', label: 'AI metadata extraction', icon: Brain },
  { id: 'done', label: 'Complete', icon: CheckCircle2 },
]

export default function UploadPage() {
  const { user } = useAuth()
  const { processDocument } = useOCR()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentStage, setCurrentStage] = useState(-1)
  const [metadata, setMetadata] = useState({
    title: '',
    department: user?.department || 'revenue',
    category: 'land',
    priority: 'medium',
  })
  const inputRef = useRef(null)

  const validateFile = useCallback((file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext)) {
      toast({ title: 'Invalid file type', description: `${ext} files are not supported`, variant: 'destructive' })
      return false
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' })
      return false
    }
    return true
  }, [toast])

  const handleFiles = useCallback((fileList) => {
    const valid = Array.from(fileList).filter(validateFile)
    if (valid.length) {
      setFiles((prev) => [...prev, ...valid.map((f) => ({ file: f, id: Math.random() }))])
    }
  }, [validateFile])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase()
    if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image className="h-5 w-5 text-accent" />
    return <FileText className="h-5 w-5 text-primary" />
  }

  const handleUpload = async () => {
    if (!files.length) {
      toast({ title: 'No files', description: 'Please select at least one file', variant: 'destructive' })
      return
    }
    setProcessing(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i]

        setCurrentStage(0) // uploading
        await new Promise((r) => setTimeout(r, 400))

        setCurrentStage(1) // ocr — real call now
        let ocrData = null
        try {
          ocrData = await processDocument(f.file)
        } catch (ocrErr) {
          console.error('OCR failed, falling back to placeholder:', ocrErr)
          toast({
            title: 'OCR had trouble reading this file',
            description: f.file.name,
            variant: 'destructive',
          })
        }

        setCurrentStage(2) // ai metadata (already computed inside processDocument)
        await new Promise((r) => setTimeout(r, 300))

        await mockApi.uploadDocument(f.file, metadata, user, ocrData)
      }
      setCurrentStage(3)
      toast({
        title: 'Upload successful',
        description: `${files.length} document${files.length > 1 ? 's' : ''} uploaded and processed`,
        variant: 'success',
      })
      setTimeout(() => {
        setFiles([])
        setCurrentStage(-1)
        setProcessing(false)
        navigate('/documents')
      }, 1200)
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
      setProcessing(false)
      setCurrentStage(-1)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Documents"
        description="Upload PDF, JPG, PNG, or DOCX files. OCR and AI metadata extraction run automatically."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drop zone */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !processing && inputRef.current?.click()}
            className={cn(
              'relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all',
              dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/30',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <motion.div
              animate={dragging ? { scale: 1.1 } : { scale: 1 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
            >
              <UploadCloud className="h-8 w-8 text-primary" />
            </motion.div>
            <h3 className="text-lg font-semibold">Drag & drop files here</h3>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {ACCEPTED_TYPES.map((t) => (
                <span key={t} className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{t.toUpperCase()}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Max file size: 10MB</p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Selected Files ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {files.map((f) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                        {getFileIcon(f.file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
                      </div>
                      {!processing && (
                        <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}

          {/* Processing stages */}
          {processing && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {stages.map((stage, i) => {
                    const Icon = stage.icon
                    const active = i === currentStage
                    const done = i < currentStage
                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                          done ? 'bg-success/10 text-success' : active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <Icon className="h-5 w-5 animate-pulse" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn('text-sm font-medium', !active && !done && 'text-muted-foreground')}>{stage.label}</p>
                          {active && (
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                className="h-full bg-primary"
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 1 }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metadata form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Document Title</Label>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  id="department"
                  value={metadata.department}
                  onChange={(v) => setMetadata({ ...metadata, department: v })}
                  options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={metadata.category}
                  onChange={(v) => setMetadata({ ...metadata, category: v })}
                  options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  id="priority"
                  value={metadata.priority}
                  onChange={(v) => setMetadata({ ...metadata, priority: v })}
                  options={PRIORITIES.map((p) => ({ value: p.id, label: p.name }))}
                  className="mt-1.5"
                />
              </div>

              <div className="rounded-lg bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ScanText className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">Auto Processing</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• OCR text extraction</li>
                  <li>• AI metadata generation</li>
                  <li>• Language detection</li>
                  <li>• Person name & address extraction</li>
                  <li>• Smart folder recommendation</li>
                </ul>
              </div>

              <Button onClick={handleUpload} className="w-full" disabled={processing || !files.length}>
                {processing ? (
                  <>Processing...</>
                ) : (
                  <>
                    Upload {files.length > 0 && `(${files.length})`} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
