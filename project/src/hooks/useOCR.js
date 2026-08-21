import { useState, useCallback } from 'react'
import { extractText } from '@/services/ocrService'
import { generateMetadata } from '@/services/metadataService'
import { classifyDocument } from '@/services/documentClassifier'
import { parseDocument } from '@/services/documentParser'
import { generateSummary } from '@/services/summaryService'
import {
  enhanceMetadataWithAI,
  generateAISummary,
  classifyWithAI,
  isAIAvailable,
} from '@/services/aiService'

export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [stage, setStage] = useState('idle') // 'idle' | 'ocr' | 'metadata' | 'ai' | 'done'

  const processDocument = useCallback(async (file, onStageChange) => {
    setIsProcessing(true)
    setError(null)
    setProgress(0)
    setStage('ocr')
    onStageChange?.('ocr')

    try {
      // ── Step 1: OCR ──────────────────────────────────────────────────────
      const ocrResult = await extractText(file, setProgress)
      console.log('OCR Result:', ocrResult)

      setStage('metadata')
      onStageChange?.('metadata')
      setProgress(0)

      // ── Step 2: Rule-based extraction ────────────────────────────────────
      const meta = generateMetadata(ocrResult.fullText)
      const parsed = parseDocument(ocrResult.fullText)
      let classification = classifyDocument(ocrResult.fullText)
      console.log('Rule-based Classification:', classification)

      // ── Step 3: AI Enhancement (non-blocking, best-effort) ───────────────
      let aiMeta = null
      let aiSummary = null

      if (isAIAvailable() && ocrResult.fullText?.trim()) {
        setStage('ai')
        onStageChange?.('ai')
        setProgress(50)

        try {
          // Single unified AI call for metadata + summary (avoids hitting rate limits)
          const aiMetaResult = await enhanceMetadataWithAI(ocrResult.fullText, {
            ...parsed,
            ...meta,
            documentType: classification.type,
          })

          if (aiMetaResult) {
            aiMeta = aiMetaResult
            console.log('AI Metadata:', aiMeta)

            if (aiMeta.summary) {
              aiSummary = aiMeta.summary
            }

            // If AI is more confident about classification, use it
            if (aiMeta.aiEnhanced && aiMeta.documentType && aiMeta.documentType !== 'Other') {
              const aiConf = 85 // Gemini's classification is generally high confidence
              if (aiConf > classification.confidence) {
                classification = {
                  type: aiMeta.documentType,
                  category: aiMeta.aiCategory || classification.category,
                  confidence: aiConf,
                }
              }
            }
          }
        } catch (aiErr) {
          console.warn('AI enhancement failed, using rule-based:', aiErr.message)
        }

        setProgress(100)
      }

      setStage('done')
      onStageChange?.('done')

      // ── Step 4: Merge everything ─────────────────────────────────────────
      const ruleBasedSummary = generateSummary(parsed, classification)
      const finalSummary = aiSummary || ruleBasedSummary

      const finalMeta = {
        // Start with rule-based
        ...parsed,
        importantDates: meta.importantDates,
        flaggedDates: meta.flaggedDates,
        location: meta.location,
        locations: meta.locations,
        emails: meta.emails || parsed.emails,
        phones: meta.phones || parsed.phones,
        referenceNumbers: meta.referenceNumbers || parsed.referenceNumbers,
        personNames: meta.personNames || [],
        addresses: meta.addresses || [],
        panNumbers: meta.panNumbers || [],
        gstNumbers: meta.gstNumbers || [],
        aadhaarNumbers: meta.aadhaarNumbers || [],
        pincodes: meta.pincodes || [],

        // AI overrides (where available and higher quality)
        ...(aiMeta && aiMeta.aiEnhanced ? {
          title: aiMeta.title || parsed.title || '',
          organization: aiMeta.organization || parsed.organization || '',
          subject: aiMeta.subject || parsed.subject || '',
          post: aiMeta.post || parsed.post || '',
          documentNumber: aiMeta.documentNumber || parsed.documentNumber || '',
          location: aiMeta.location || meta.location || '',
          language: aiMeta.language || meta.language || 'English',
          tags: aiMeta.tags?.length ? aiMeta.tags : (parsed.tags || []),
          keywords: aiMeta.tags?.length ? aiMeta.tags : (parsed.keywords || []),
          personNames: aiMeta.personNames?.length ? aiMeta.personNames : (meta.personNames || []),
          addresses: aiMeta.addresses?.length ? aiMeta.addresses : (meta.addresses || []),
          importantDates: aiMeta.importantDates?.length ? aiMeta.importantDates : meta.importantDates,
          urgencyLevel: aiMeta.urgencyLevel || 'medium',
          keyEntities: aiMeta.keyEntities || {},
          aiEnhanced: true,
        } : { aiEnhanced: false }),

        summary: finalSummary,
        classificationConfidence: classification.confidence,
        aiSummary: Boolean(aiSummary),
      }

      return {
        ocrText: ocrResult.fullText,
        ocrConfidence: ocrResult.ocrConfidence,
        pageCount: ocrResult.pageCount,
        language: finalMeta.language || meta.language || 'English',
        documentType: classification.type,
        category: classification.category,
        metadata: finalMeta,
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsProcessing(false)
      setStage('idle')
    }
  }, [])

  return { processDocument, progress, isProcessing, error, stage }
}