import { useState, useCallback } from 'react'
import { extractText } from '@/services/ocrService'
import { generateMetadata } from '@/services/metadataService'

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
      const meta = generateMetadata(ocrResult.fullText)
      return {
        ocrText: ocrResult.fullText,
        ocrConfidence: ocrResult.ocrConfidence,
        pageCount: ocrResult.pageCount,
        language: meta.language,
        metadata: {
          importantDates: meta.importantDates,
          flaggedDates: meta.flaggedDates,
          location: meta.location,
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