const DEVANAGARI_REGEX = /[\u0900-\u097F]/g
const DATE_REGEX = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g
const LOCATION_HINTS = ['Pune', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad', 'Mumbai', 'Ganeshkhind']

export function detectLanguage(text) {
  const devanagariCount = (text.match(DEVANAGARI_REGEX) || []).length
  const totalChars = text.replace(/\s/g, '').length || 1
  const ratio = devanagariCount / totalChars
  if (ratio > 0.6) return 'Marathi'
  if (ratio > 0.15) return 'Bilingual'
  return 'English'
}

export function extractDates(text) {
  const currentYear = new Date().getFullYear()
  return [...text.matchAll(DATE_REGEX)].map(([raw, d, m, y]) => {
    const year = parseInt(y, 10)
    const month = parseInt(m, 10)
    const day = parseInt(d, 10)
    const plausible = year >= currentYear - 10 && year <= currentYear + 2
      && month >= 1 && month <= 12 && day >= 1 && day <= 31
    const iso = plausible
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    return { raw, iso, flaggedForReview: !plausible }
  })
}

export function extractLocations(text) {
  return LOCATION_HINTS.filter((loc) => text.includes(loc))
}

export function generateMetadata(fullText) {
  const dates = extractDates(fullText)
  const locations = extractLocations(fullText)
  return {
    language: detectLanguage(fullText),
    importantDates: dates.filter((d) => d.iso).map((d) => d.iso),
    flaggedDates: dates.filter((d) => d.flaggedForReview).map((d) => d.raw),
    location: locations[0] || null,
    locations,
  }
}
