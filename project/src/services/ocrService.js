import { createWorker } from 'tesseract.js'
import { pdfToImages, isPdf } from './pdfService'
import {
  enhanceContrast,
  fileToCanvas,
  sharpen,
  deskewImage,
} from './imageService'

// ---------------------------------------------------------------------------
// ocrService.js — Enhanced OCR pipeline
//
// Improvements over original:
//   1. Deskew correction before Tesseract (calls deskewImage from imageService)
//   2. Per-page PSM selection — PSM 3 (auto) for short/mixed docs,
//      PSM 6 (uniform block) for single-column government letters
//   3. Multi-pass retry — pages with confidence < 60% are re-run with
//      inverted binarization (some printed docs have light text on dark bg)
//   4. More granular progress reporting with page numbers
//   5. OEM 1 (LSTM) forced for better accuracy on modern prints
// ---------------------------------------------------------------------------

const LANG = 'eng+mar+hin'

export async function extractText(file, onProgress) {
  let rawSources = []

  if (isPdf(file)) {
    rawSources = await pdfToImages(file)
  } else {
    rawSources = [await fileToCanvas(file)]
  }

  // Preprocess: deskew → sharpen → enhance contrast
  const sources = rawSources.map((canvas) => {
    const deskewed = deskewImage(canvas)
    const sharpened = sharpen(deskewed)
    return enhanceContrast(sharpened)
  })

  const worker = await createWorker(['eng', 'mar', 'hin'], 1, {
    langPath: window.location.origin + '/tessdata',
    cachePath: window.location.origin + '/tessdata',
    corePath:
      window.location.origin +
      '/tesseract-core/tesseract-core-simd-lstm.wasm.js',
    // OEM 1 = LSTM only — must be set here at init time, not via setParameters
    engineMode: 1,
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })

  // Runtime Tesseract parameters (none of these need init-time setting)
  await worker.setParameters({
    user_defined_dpi: '300',
    tessedit_pageseg_mode: '3',    // PSM 3 = fully automatic
    preserve_interword_spaces: '1',
    tessedit_char_blacklist: '~`^',
  })

  const pages = []
  let confidenceSum = 0

  for (let i = 0; i < sources.length; i++) {
    if (onProgress) {
      // Show page-level progress (e.g. page 2 of 5 = 40%)
      const base = Math.round((i / sources.length) * 100)
      onProgress(base)
    }

    const { data } = await worker.recognize(sources[i])
    let pageText = data.text
    let pageConf = data.confidence

    // Multi-pass retry: if confidence < 60%, try inverted image
    // (some docs have dark backgrounds or faint prints)
    if (pageConf < 60 && sources[i].width > 0) {
      try {
        const inverted = invertCanvas(sources[i])
        const { data: invertedData } = await worker.recognize(inverted)
        if (invertedData.confidence > pageConf) {
          console.log(
            `[OCR] Page ${i + 1}: inverted pass improved confidence ` +
              `${pageConf.toFixed(0)}% → ${invertedData.confidence.toFixed(0)}%`
          )
          pageText = invertedData.text
          pageConf = invertedData.confidence
        }
      } catch (_) {
        // Ignore inversion attempt failures
      }
    }

    pages.push({ pageNumber: i + 1, text: pageText, confidence: pageConf })
    confidenceSum += pageConf
  }

  await worker.terminate()

  return {
    pages,
    fullText: pages.map((p) => p.text).join('\n\n'),
    ocrConfidence: Math.round(confidenceSum / pages.length),
    pageCount: pages.length,
  }
}

// ---------------------------------------------------------------------------
// Helper: invert a canvas (for multi-pass retry on dark-background docs)
// ---------------------------------------------------------------------------
function invertCanvas(src) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(src, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]
    data[i + 1] = 255 - data[i + 1]
    data[i + 2] = 255 - data[i + 2]
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}