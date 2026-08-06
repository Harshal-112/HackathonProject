import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UploadCloud, FileText, Image, FileCheck, X, ScanText, Brain,
  CheckCircle2, AlertCircle, Sparkles, ArrowRight, Wand2, Eye,
  ChevronDown, ChevronUp, Zap, RefreshCw, Check, ShieldCheck, ShieldOff,
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
import { isAIAvailable } from '@/services/aiService'
import { autoRouteDocument } from '@/services/workflowAutomation'
import { usePrivacy } from '@/lib/privacy-context'

const ACCEPTED_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.docx']
const MAX_SIZE = 10 * 1024 * 1024

const getStages = (isConfidential) => [
  { id: 'uploading', label: 'Preparing file', icon: UploadCloud },
  { id: 'ocr', label: 'Running OCR extraction', icon: ScanText },
  { id: 'metadata', label: 'Extracting metadata', icon: FileCheck },
  ...(!isConfidential && isAIAvailable()
    ? [{ id: 'ai', label: 'AI document analysis (Local + Enhanced)', icon: Wand2 }]
    : []),
  { id: 'done', label: 'Complete', icon: CheckCircle2 },
]

const STAGE_ID_TO_INDEX = (stages) => {
  const map = {}
  stages.forEach((s, i) => { map[s.id] = i })
  return map
}

export default function UploadPage() {
  const { user } = useAuth()
  const { processDocument } = useOCR()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { confidentialMode } = usePrivacy()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentStageId, setCurrentStageId] = useState(null)
  const [ocrPreview, setOcrPreview] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const [cachedOcrData, setCachedOcrData] = useState(null)

  const [metadata, setMetadata] = useState({
    title: '',
    department: user?.department || 'revenue',
    category: 'land',
    priority: 'medium',
  })
  const inputRef = useRef(null)
  const stages = getStages(confidentialMode)
  const stageIndex = STAGE_ID_TO_INDEX(stages)

  const currentStageNum = currentStageId ? (stageIndex[currentStageId] ?? -1) : -1

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

  // Run AI & OCR Auto-Detection on a selected file to fill form fields
  const runAutoDetect = useCallback(async (fileObj) => {
    if (!fileObj || processing) return
    setProcessing(true)
    setOcrPreview(null)
    setAutoFilled(false)

    try {
      setCurrentStageId('uploading')
      await new Promise((r) => setTimeout(r, 200))

      setCurrentStageId('ocr')
      const ocrData = await processDocument(fileObj.file, (stageId) => {
        setCurrentStageId(stageId)
      })

      if (ocrData) {
        const autoRoute = autoRouteDocument({
          classification: { type: ocrData.documentType, category: ocrData.category },
          ocrText: ocrData.ocrText,
          importantDates: ocrData.metadata?.importantDates || [],
        })

        // Auto-fill Title, Department, Category, and Priority
        const detectedTitle = ocrData.metadata?.title || fileObj.file.name.replace(/\.[^.]+$/, '')
        const detectedDept = autoRoute.department || user?.department || 'revenue'
        const detectedCat = autoRoute.category || 'correspondence'
        const detectedPriority = autoRoute.priority || 'medium'

        setMetadata({
          title: detectedTitle,
          department: detectedDept,
          category: detectedCat,
          priority: detectedPriority,
        })
        setAutoFilled(true)
        setCachedOcrData(ocrData)

        setOcrPreview({
          text: ocrData.ocrText?.slice(0, 500) || '',
          confidence: ocrData.ocrConfidence,
          type: ocrData.documentType,
          aiEnhanced: ocrData.metadata?.aiEnhanced || false,
          title: detectedTitle,
          organization: ocrData.metadata?.organization || '',
          subject: ocrData.metadata?.subject || '',
          language: ocrData.language,
          suggestedDept: detectedDept,
          suggestedCat: detectedCat,
          suggestedPriority: detectedPriority,
        })
        setShowPreview(true)
        toast({
          title: '✨ Document details auto-filled!',
          description: 'Title, Department, Category, and Priority populated from AI & OCR analysis.',
          variant: 'success',
        })
      }
    } catch (err) {
      console.error('Auto-detect error:', err)
      toast({
        title: 'OCR scan failed',
        description: 'You can manually fill in document details below.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
      setCurrentStageId(null)
    }
  }, [processDocument, toast, user?.department, processing])

  const handleFiles = useCallback((fileList) => {
    const valid = Array.from(fileList).filter(validateFile)
    if (valid.length) {
      const newItems = valid.map((f) => ({ file: f, id: Math.random() }))
      setFiles((prev) => [...prev, ...newItems])
      // Trigger auto-detection on the newly added file
      runAutoDetect(newItems[0])
    }
  }, [validateFile, runAutoDetect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (id) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (!next.length) {
        setOcrPreview(null)
        setCachedOcrData(null)
        setAutoFilled(false)
        setMetadata({
          title: '',
          department: user?.department || 'revenue',
          category: 'land',
          priority: 'medium',
        })
      }
      return next
    })
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

        let ocrData = cachedOcrData
        if (!ocrData) {
          setCurrentStageId('uploading')
          await new Promise((r) => setTimeout(r, 200))
          setCurrentStageId('ocr')

          try {
            ocrData = await processDocument(f.file, (stageId) => {
              setCurrentStageId(stageId)
            })
          } catch (ocrErr) {
            console.error('OCR failed:', ocrErr)
          }
        }

        await mockApi.uploadDocument(f.file, metadata, user, ocrData)
      }

      setCurrentStageId('done')
      toast({
        title: 'Upload successful',
        description: `${files.length} document${files.length > 1 ? 's' : ''} uploaded and saved`,
        variant: 'success',
      })

      setTimeout(() => {
        setFiles([])
        setCurrentStageId(null)
        setProcessing(false)
        setOcrPreview(null)
        setCachedOcrData(null)
        setAutoFilled(false)
        navigate('/documents')
      }, 1500)
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
      setProcessing(false)
      setCurrentStageId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Documents"
        description="Upload PDF, JPG, PNG, or DOCX files. Document details are auto-detected by OCR & AI."
      >
        {confidentialMode ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-3 w-3" />
            Strict Confidentiality Mode
          </div>
        ) : isAIAvailable() && (
          <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800">
            <Zap className="h-3 w-3" />
            AI Enhanced
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drop zone + file list + stages */}
        <div className="lg:col-span-2 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !processing && inputRef.current?.click()}
            className={cn(
              'relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all',
              dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/30',
              processing && 'pointer-events-none opacity-75',
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
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Selected Files ({files.length})
                </CardTitle>
                {files[0] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runAutoDetect(files[0])}
                    disabled={processing}
                    className="text-xs text-primary gap-1"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', processing && 'animate-spin')} />
                    Re-scan File
                  </Button>
                )}
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
                    const active = i === currentStageNum
                    const done = i < currentStageNum
                    const isAIStage = stage.id === 'ai'
                    return (
                      <div key={stage.id} className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                          done ? 'bg-success/10 text-success' :
                          active && isAIStage ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' :
                          active ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted-foreground',
                        )}>
                          {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <Icon className="h-5 w-5 animate-pulse" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn('text-sm font-medium', !active && !done && 'text-muted-foreground')}>
                              {stage.label}
                            </p>
                            {isAIStage && active && (
                              <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full">
                                AI
                              </span>
                            )}
                          </div>
                          {active && (
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                className={cn('h-full', isAIStage ? 'bg-violet-500' : 'bg-primary')}
                                initial={{ width: '0%' }}
                                animate={{ width: '100%' }}
                                transition={{ duration: isAIStage ? 3 : 1 }}
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

          {/* OCR Preview */}
          <AnimatePresence>
            {ocrPreview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Extraction Preview
                        {ocrPreview.aiEnhanced && (
                          <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Wand2 className="h-2.5 w-2.5" /> AI Enhanced
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Detected Type</p>
                        <p className="text-sm font-medium mt-0.5">{ocrPreview.type || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">OCR Confidence</p>
                        <p className={cn(
                          'text-sm font-medium mt-0.5',
                          ocrPreview.confidence >= 80 ? 'text-success' :
                          ocrPreview.confidence >= 60 ? 'text-warning' : 'text-destructive'
                        )}>{ocrPreview.confidence}%</p>
                      </div>
                      {ocrPreview.title && (
                        <div className="col-span-2 rounded-lg bg-muted/50 p-2.5">
                          <p className="text-xs text-muted-foreground">Detected Title</p>
                          <p className="text-sm font-medium mt-0.5 truncate">{ocrPreview.title}</p>
                        </div>
                      )}
                      {ocrPreview.organization && (
                        <div className="col-span-2 rounded-lg bg-muted/50 p-2.5">
                          <p className="text-xs text-muted-foreground">Organization</p>
                          <p className="text-sm font-medium mt-0.5 truncate">{ocrPreview.organization}</p>
                        </div>
                      )}
                      {ocrPreview.language && (
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <p className="text-xs text-muted-foreground">Language</p>
                          <p className="text-sm font-medium mt-0.5">{ocrPreview.language}</p>
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {showPreview && ocrPreview.text && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1">OCR Text Snippet</p>
                          <div className="rounded-lg bg-muted/50 p-3 max-h-36 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                              {ocrPreview.text}
                            </pre>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Metadata form */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Document Details
                </div>
                {autoFilled && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                    <Check className="h-3 w-3" /> Auto-Filled
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="title">Document Title</Label>
                  {autoFilled && <span className="text-[10px] text-muted-foreground">Detected</span>}
                </div>
                <Input
                  id="title"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  placeholder="Will be auto-detected on select"
                  className={cn('mt-1.5', autoFilled && 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="department">Department</Label>
                  {autoFilled && <span className="text-[10px] text-muted-foreground">Auto-routed</span>}
                </div>
                <Select
                  id="department"
                  value={metadata.department}
                  onChange={(v) => setMetadata({ ...metadata, department: v })}
                  options={DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))}
                  className={cn('mt-1.5', autoFilled && 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="category">Category</Label>
                  {autoFilled && <span className="text-[10px] text-muted-foreground">Auto-classified</span>}
                </div>
                <Select
                  id="category"
                  value={metadata.category}
                  onChange={(v) => setMetadata({ ...metadata, category: v })}
                  options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))}
                  className={cn('mt-1.5', autoFilled && 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="priority">Priority</Label>
                  {autoFilled && <span className="text-[10px] text-muted-foreground">Auto-assigned</span>}
                </div>
                <Select
                  id="priority"
                  value={metadata.priority}
                  onChange={(v) => setMetadata({ ...metadata, priority: v })}
                  options={PRIORITIES.map((p) => ({ value: p.id, label: p.name }))}
                  className={cn('mt-1.5', autoFilled && 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10')}
                />
              </div>

              <div className="rounded-lg bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">Smart Auto-Fill</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Selecting a file automatically scans the document using OCR & AI to pre-fill Title, Department, Category, and Priority. You can edit any field before uploading.
                </p>
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
