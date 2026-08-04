import Tesseract from 'tesseract.js'
import { pdfToImages, isPdf } from './pdfService'
import {
  enhanceContrast,
  fileToCanvas,
  sharpen
} from './imageService'
import { createWorker } from 'tesseract.js'

const LANG = 'eng+mar+hin'
const TESSDATA_PATH = '/tessdata' // matches public/tessdata folder

export async function extractText(file, onProgress) {
  let rawSources = []
  if (isPdf(file)) {
    rawSources = await pdfToImages(file)
  } else {
    rawSources = [await fileToCanvas(file)]
  }

  const sources = rawSources.map((canvas) => {
    const sharpened = sharpen(canvas);
    return enhanceContrast(sharpened);
});

  const worker = await createWorker(['eng', 'mar', 'hin'], 1, {
    langPath: window.location.origin + '/tessdata',
    cachePath: window.location.origin + '/tessdata',
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  await worker.setParameters({
    user_defined_dpi: "300"
  });

  await worker.setParameters({
    tessedit_pageseg_mode: "3", // fully automatic page segmentation — handles letterheads/stamps/multi-region layouts; PSM 6 assumed one uniform block and mishandled mixed layouts
    preserve_interword_spaces: "1",
    tessedit_char_blacklist: "~`^"
  });
  const pages = []
  let confidenceSum = 0
  for (let i = 0; i < sources.length; i++) {
    const { data } = await worker.recognize(sources[i])
    pages.push({ pageNumber: i + 1, text: data.text, confidence: data.confidence })
    confidenceSum += data.confidence
  }
  await worker.terminate()

  return {
    pages,
    fullText: pages.map((p) => p.text).join('\n\n'),
    ocrConfidence: Math.round(confidenceSum / pages.length),
    pageCount: pages.length,
  }
}