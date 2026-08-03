import { useState, useCallback } from 'react'
import { extractText } from '@/services/ocrService'
import { generateMetadata } from '@/services/metadataService'
import { classifyDocument } from '@/services/documentClassifier'
import { parseDocument } from '@/services/documentParser'

export function useOCR() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const processDocument = useCallback(async (file) => {
    setIsProcessing(true)
    setError(null)
    setProgress(0)
    try {
      const ocrResult = await extractText(file, setProgress)
      console.log("OCR Result:", ocrResult)
      const meta = generateMetadata(ocrResult.fullText)
      console.log("Metadata:", meta)
      const parsed = parseDocument(ocrResult.fullText);
      console.log("Parsed Document:", parsed);
      const classification = classifyDocument(ocrResult.fullText);
      console.log("Classification:", classification);
      return {
        ocrText: ocrResult.fullText,
        ocrConfidence: ocrResult.ocrConfidence,
        pageCount: ocrResult.pageCount,
        language: meta.language,
        documentType: classification.type,
        category: classification.category,
        metadata: {
          ...parsed,
          importantDates: meta.importantDates,
          flaggedDates: meta.flaggedDates,
          location: meta.location,
          classificationConfidence:
            classification.confidence
        },
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [])

  return { processDocument, progress, isProcessing, error }
}