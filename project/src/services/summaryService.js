// ---------------------------------------------------------------------------
// summaryService.js — Richer rule-based document summaries
//
// This is used as fallback when AI (Gemini) summary is not available.
// When AI is available, generateAISummary() in aiService.js is used instead.
// ---------------------------------------------------------------------------

export function generateSummary(metadata, classification) {
  const parts = []

  // Document type
  if (classification?.type && classification.type !== 'Other') {
    const article = /^[aeiou]/i.test(classification.type) ? 'an' : 'a'
    const conf = classification.confidence ? ` (${classification.confidence}% confidence)` : ''
    parts.push(`This document was classified as ${article} **${classification.type}**${conf}.`)
  }

  // Issuer
  if (metadata.organization) {
    parts.push(`Issued by ${metadata.organization}.`)
  }

  // Subject
  if (metadata.subject) {
    parts.push(`Subject: ${metadata.subject}.`)
  }

  // Post/role
  if (metadata.post) {
    parts.push(`Related to the post/designation: ${metadata.post}.`)
  }

  // Document/reference number
  if (metadata.documentNumber) {
    parts.push(`Primary reference number: ${metadata.documentNumber}.`)
  } else if (metadata.referenceNumbers?.length) {
    parts.push(`Reference number(s): ${metadata.referenceNumbers.slice(0, 2).join(', ')}.`)
  }

  // Important dates
  if (metadata.importantDates?.length) {
    const formatted = metadata.importantDates.slice(0, 2).map(d => {
      try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      } catch { return d }
    })
    parts.push(`Key date(s): ${formatted.join(', ')}.`)
  }

  // Location
  if (metadata.location) {
    parts.push(`Location: ${metadata.location}.`)
  }

  // Person names
  if (metadata.personNames?.length) {
    parts.push(`Persons mentioned: ${metadata.personNames.slice(0, 3).join(', ')}.`)
  }

  // Language
  if (metadata.language && metadata.language !== 'English') {
    parts.push(`Document language: ${metadata.language}.`)
  }

  if (!parts.length) {
    return 'This document\'s content could not be reliably identified from OCR. Please review it manually and fill in any missing details.'
  }

  return parts.join(' ')
}