import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Wand2, AlertTriangle, CheckCircle2, Info, Sparkles,
  Tag, User, MapPin, Hash, Calendar, Building2, FileText, Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// AI Insights Panel — shown on document-details.jsx when metadata is available
// Shows: AI-generated summary, confidence breakdown, extracted entities,
//        suggested actions, and missing field warnings.
// ---------------------------------------------------------------------------

function ConfidencePill({ score }) {
  const color =
    score >= 85 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' :
    score >= 65 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400' :
    'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'

  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>
      {score}% confidence
    </span>
  )
}

function InsightChip({ children, icon: Icon, variant = 'default' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border',
      variant === 'ai' && 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300',
      variant === 'default' && 'border-border bg-muted/50 text-muted-foreground',
      variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    )}>
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  )
}

export function AIInsightsPanel({ doc }) {
  if (!doc) return null

  const meta = doc.metadata || {}
  const isAiEnhanced = meta.aiEnhanced === true
  const classification = doc.documentType

  // Detect missing important fields
  const missingFields = []
  if (!meta.organization) missingFields.push('Organization')
  if (!meta.subject && !meta.title) missingFields.push('Subject')
  if (!meta.importantDates?.length) missingFields.push('Dates')
  if (!meta.personNames?.length) missingFields.push('Person Names')

  // Suggested actions based on doc type and status
  const suggestions = []
  if (doc.status === 'pending') {
    suggestions.push('Document is awaiting approval — assign to a verifier.')
  }
  if (meta.urgencyLevel === 'urgent' || doc.priority === 'urgent') {
    suggestions.push('Marked urgent — requires immediate attention.')
  }
  if (doc.ocrConfidence < 65) {
    suggestions.push('Low OCR confidence — consider re-uploading a clearer scan.')
  }
  if (missingFields.length > 2) {
    suggestions.push('Several metadata fields are empty — manual review recommended.')
  }

  return (
    <Card className={cn(
      'overflow-hidden border',
      isAiEnhanced
        ? 'border-violet-200 dark:border-violet-800'
        : 'border-border'
    )}>
      <CardHeader className={cn(
        'pb-3',
        isAiEnhanced && 'bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-900/20'
      )}>
        <CardTitle className="text-base flex items-center gap-2">
          {isAiEnhanced ? (
            <>
              <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              AI-Powered Insights
              <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-1 ml-auto">
                <Zap className="h-2.5 w-2.5" /> Gemini Enhanced
              </span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 text-primary" />
              Document Insights
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* AI Summary */}
        {meta.summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {meta.aiSummary ? 'AI-Generated Summary' : 'Auto Summary'}
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {meta.summary}
            </p>
          </div>
        )}

        {/* Classification + Confidence */}
        {classification && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Document Type</p>
              <Badge variant="outline" className="font-medium">{classification}</Badge>
            </div>
            {meta.classificationConfidence != null && (
              <ConfidencePill score={meta.classificationConfidence} />
            )}
          </div>
        )}

        {/* Key Entities (AI-extracted) */}
        {meta.keyEntities && Object.keys(meta.keyEntities).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Key Entities
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(meta.keyEntities).slice(0, 6).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 p-2 text-xs">
                  <p className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                  <p className="font-medium mt-0.5 truncate">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Person Names */}
        {meta.personNames?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <User className="h-3 w-3" /> Persons Mentioned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta.personNames.map((name, i) => (
                <InsightChip key={i} icon={User} variant={isAiEnhanced ? 'ai' : 'default'}>
                  {name}
                </InsightChip>
              ))}
            </div>
          </div>
        )}

        {/* Addresses */}
        {meta.addresses?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Addresses Found
            </p>
            <div className="space-y-1">
              {meta.addresses.slice(0, 3).map((addr, i) => (
                <p key={i} className="text-xs bg-muted/50 rounded-lg p-2">{addr}</p>
              ))}
            </div>
          </div>
        )}

        {/* Document Numbers (PAN, GST, etc.) */}
        {(meta.panNumbers?.length > 0 || meta.gstNumbers?.length > 0 || meta.aadhaarNumbers?.length > 0) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Special ID Numbers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta.panNumbers?.map((pan, i) => (
                <InsightChip key={`pan-${i}`} variant="default">PAN: {pan}</InsightChip>
              ))}
              {meta.gstNumbers?.map((gst, i) => (
                <InsightChip key={`gst-${i}`} variant="default">GST: {gst}</InsightChip>
              ))}
              {meta.aadhaarNumbers?.map((uid, i) => (
                <InsightChip key={`uid-${i}`} variant="default">Aadhaar: {uid}</InsightChip>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {meta.tags?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Auto-generated Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meta.tags.slice(0, 12).map((tag, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    isAiEnhanced
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Urgency level */}
        {meta.urgencyLevel && meta.urgencyLevel !== 'medium' && (
          <div className={cn(
            'flex items-center gap-2 rounded-lg p-2.5 text-sm',
            meta.urgencyLevel === 'urgent' || meta.urgencyLevel === 'high'
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-muted/50 text-muted-foreground'
          )}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="capitalize font-medium">
              AI detected {meta.urgencyLevel} urgency level
            </span>
          </div>
        )}

        {/* Suggested Actions */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Info className="h-3 w-3" /> Suggested Actions
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing fields warning */}
        {missingFields.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Missing Fields Detected
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              {missingFields.join(', ')} could not be automatically extracted. Consider editing this document to fill them in.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
