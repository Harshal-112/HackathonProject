import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  Cpu, Zap, Info, ShieldAlert, ArrowRight, Building2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// XAI Panel — Explainable AI & Decision Transparency UI Component
//
// Render Structure:
//   1. Header & Overall Decision Confidence
//   2. Recommended Action Callout (Auto Process / Manual Verification / Manual Review Required)
//   3. All 5 Feature Contributions (Title 30%, Keywords 25%, Org 20%, OCR 15%, Dates 10%)
//   4. Decision Trace (Numbered observable event steps)
//   5. Mechanism Consensus (Rule Engine vs AI Engine, Delta, Consensus Badge)
//   6. Department Routing Explanation (Separate routing reason & destination)
// ---------------------------------------------------------------------------

function barColor(score) {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 45) return 'bg-blue-500'
  if (score > 0) return 'bg-amber-500'
  return 'bg-slate-300 dark:bg-slate-700'
}

export function XAIPanel({ xaiData }) {
  const [expanded, setExpanded] = useState(true)

  if (!xaiData) return null

  const {
    classificationType,
    overallConfidence,
    featureEvidenceScore,
    status,
    recommendedAction,
    featureSaliency,
    decisionTrace,
    consensus,
    routingExplanation,
  } = xaiData

  const isLowConfidence = status === 'LOW CONFIDENCE' || recommendedAction === 'MANUAL REVIEW REQUIRED'
  const isHighConfidence = status === 'HIGH CONFIDENCE'

  return (
    <Card className={cn(
      'overflow-hidden border transition-all',
      isLowConfidence
        ? 'border-red-300 dark:border-red-800/60 bg-red-50/10'
        : isHighConfidence
          ? 'border-emerald-300 dark:border-emerald-800/60'
          : 'border-amber-300 dark:border-amber-800/60',
    )}>
      {/* Header */}
      <CardHeader className="pb-3 pt-4 px-4 bg-muted/30">
        <CardTitle className="text-sm flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 hover:text-primary transition-colors text-left"
          >
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg',
              isLowConfidence
                ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
            )}>
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-xs uppercase text-muted-foreground">
                Explainable AI
              </span>
              <span className="font-semibold text-sm text-foreground">
                WHY THIS CLASSIFICATION?
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[11px] font-bold px-2.5 py-1 rounded-full uppercase border',
              isHighConfidence
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : isLowConfidence
                  ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse'
                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
            )}>
              {status} ({overallConfidence}%)
            </span>
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="p-4 space-y-5">
              {/* Classification Overview & Recommended Action Banner */}
              <div className="rounded-lg border bg-card p-3.5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground block">Document Classification</span>
                    <span className="text-base font-bold text-foreground">{classificationType}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-muted-foreground block">Overall Decision Confidence</span>
                    <span className="text-base font-bold font-mono text-primary">{overallConfidence}%</span>
                  </div>
                </div>

                {/* Recommended Action Banner */}
                <div className={cn(
                  'flex items-center gap-2.5 p-2.5 rounded-md border text-xs font-semibold',
                  isLowConfidence
                    ? 'bg-red-100/70 border-red-300 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300'
                    : isHighConfidence
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100/70 border-amber-300 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300',
                )}>
                  {isLowConfidence ? (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div className="flex-1">
                    <span>Recommended Action: {recommendedAction}</span>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/80 leading-normal italic">
                  Overall confidence is derived from weighted document evidence and classification consistency. It is not the AI confidence alone.
                </p>
              </div>

              {/* 1. Feature Contributions (ALWAYS ALL 5 FEATURES) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Feature Contributions (100% Total)
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Evidence Score: {featureEvidenceScore}/100
                  </span>
                </div>

                <div className="space-y-2.5">
                  {featureSaliency?.map((f) => (
                    <div key={f.featureKey} className="rounded-lg border bg-muted/20 p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-medium">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {f.feature}
                          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                            Weight: {f.weightPercent}
                          </span>
                        </span>
                        <span className="font-mono text-foreground font-bold">
                          +{f.contribution}pt <span className="text-[10px] text-muted-foreground font-normal">({f.score}/100)</span>
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(3, f.score)}%` }}
                          transition={{ duration: 0.4 }}
                          className={cn('h-full rounded-full', barColor(f.score))}
                        />
                      </div>

                      {/* Human readable explanation */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                        {f.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Decision Trace */}
              {decisionTrace?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-blue-500" /> Decision Trace
                  </p>
                  <div className="relative pl-4 space-y-2 border-l-2 border-primary/20 ml-1.5">
                    {decisionTrace.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative pl-3"
                      >
                        <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <span className="text-[7px] font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-xs text-foreground/90 leading-relaxed font-sans">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Classification Consensus (Two Classification Mechanisms) */}
              {consensus && (
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-violet-500" /> Classification Mechanisms Consensus
                  </p>

                  <div className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-md bg-muted/40 p-2 border">
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Rule-Based Classifier</span>
                        <p className="font-bold text-foreground mt-0.5 truncate">{consensus.ruleResult}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Confidence: {consensus.ruleConfidence}%</p>
                      </div>

                      <div className="rounded-md bg-muted/40 p-2 border">
                        <span className="text-[10px] font-semibold text-muted-foreground block uppercase">Gemini AI Classifier</span>
                        {consensus.aiResult ? (
                          <>
                            <p className="font-bold text-foreground mt-0.5 truncate">{consensus.aiResult}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Confidence: {consensus.aiConfidence}%</p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-muted-foreground mt-0.5">Unavailable</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">Single-Engine Mode</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">Consensus:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          consensus.consensusStatus === 'Engines Agree'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : consensus.consensusStatus === 'Engines Disagree'
                              ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 animate-pulse'
                              : 'bg-muted text-muted-foreground border-border',
                        )}>
                          {consensus.consensusStatus}
                        </span>
                      </div>
                      {consensus.aiResult && (
                        <span className="text-muted-foreground font-mono text-[11px]">
                          Confidence Delta: <span className="font-semibold text-foreground">{consensus.confidenceDelta}%</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                      {consensus.note}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Separate Department Routing Explanation */}
              {routingExplanation && (
                <div>
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-500" /> Department Routing Explanation
                  </p>
                  <div className="rounded-lg border bg-emerald-50/20 dark:bg-emerald-950/10 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">Destination: {routingExplanation.destinationDepartment}</span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Priority: {routingExplanation.priority}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      Reason: {routingExplanation.routingReason}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
