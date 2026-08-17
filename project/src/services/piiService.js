// ---------------------------------------------------------------------------
// piiService.js — Privacy & PII Detection / Redaction Service
//
// Provides robust, OCR-tolerant PII detection and redaction for Indian
// government documents and personal records.
//
// Features:
//  - Unicode & OCR text normalization (whitespace, line breaks, separators)
//  - Tolerant pattern matching (Aadhaar, PAN, GSTIN, Phone, Email, Voter ID, Passport)
//  - Safe fail-soft redaction checking before any external processing
//  - Does not claim 100% detection guarantee (privacy-aware data minimization)
// ---------------------------------------------------------------------------

/**
 * Normalizes text prior to PII matching to overcome OCR anomalies
 * such as non-standard whitespace, line breaks across numbers, and hyphen variations.
 */
export function normalizeTextForPII(text) {
  if (!text || typeof text !== 'string') return ''

  return text
    // Normalize Unicode characters to canonical composition
    .normalize('NFKC')
    // Replace diverse dashes/hyphens with a standard ASCII hyphen
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // Replace non-breaking and special spaces with standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Collapse multiple horizontal spaces/tabs
    .replace(/[ \t]+/g, ' ')
}

/**
 * Regular expressions for Indian identity and contact information.
 * Designed to be tolerant of OCR spacing and standard punctuation variations.
 */
export const PII_PATTERNS = {
  // Aadhaar: 12 digits, often grouped in 4s with spaces, hyphens, or optional line break
  aadhaar: /\b(?:\d[\s-]?){11}\d\b/g,
  // PAN Card: 5 letters, 4 numbers, 1 letter (tolerant of internal spacing)
  pan: /\b[A-Za-z]{5}[\s-]?[0-9]{4}[\s-]?[A-Za-z]\b/g,
  // GSTIN: 2 numbers, 5 letters, 4 numbers, 1 letter, 1 char, 1 'Z', 1 char
  gstin: /\b[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[A-Za-z0-9]{1}[Zz]{1}[A-Za-z0-9]{1}\b/g,
  // Indian Phone numbers: optional +91, followed by 10 digits starting with 6-9
  phone: /\b(?:\+91[\s-]?)?[6-9]\d{1}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Email address
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // Voter ID (EPIC): 3 letters + 7 digits
  voterId: /\b[A-Za-z]{3}[\s-]?[0-9]{7}\b/g,
  // Passport (Indian): 1 letter + 7 digits
  passport: /\b[A-Za-z][\s-]?[0-9]{7}\b/g,
}

/**
 * Detects all sensitive PII items in text and returns detailed item metadata.
 */
export function detectPII(rawText) {
  if (!rawText || typeof rawText !== 'string') return []

  const text = normalizeTextForPII(rawText)
  const results = []
  const seenOriginals = new Set()

  // 1. Aadhaar
  const aadhaarMatches = text.match(PII_PATTERNS.aadhaar) || []
  for (const match of aadhaarMatches) {
    const cleanDigits = match.replace(/[\s-]/g, '')
    // Must be exactly 12 digits and not all identical (e.g. 000000000000)
    if (cleanDigits.length === 12 && !/^(\d)\1{11}$/.test(cleanDigits)) {
      if (!seenOriginals.has(match)) {
        seenOriginals.add(match)
        results.push({
          type: 'Aadhaar',
          original: match,
          masked: `XXXX XXXX ${cleanDigits.slice(-4)}`,
          icon: 'Fingerprint',
          severity: 'high',
          riskLevel: 'High Risk (Citizen Identity)',
        })
      }
    }
  }

  // 2. PAN Card
  const panMatches = text.match(PII_PATTERNS.pan) || []
  for (const match of panMatches) {
    const cleanPan = match.replace(/[\s-]/g, '').toUpperCase()
    if (cleanPan.length === 10 && !seenOriginals.has(match)) {
      seenOriginals.add(match)
      results.push({
        type: 'PAN Card',
        original: match,
        masked: `${cleanPan.slice(0, 3)}XX${cleanPan.slice(5, 9)}X`,
        icon: 'CreditCard',
        severity: 'high',
        riskLevel: 'High Risk (Financial Identifier)',
      })
    }
  }

  // 3. GSTIN
  const gstinMatches = text.match(PII_PATTERNS.gstin) || []
  for (const match of gstinMatches) {
    const cleanGst = match.replace(/[\s-]/g, '').toUpperCase()
    if (cleanGst.length === 15 && !seenOriginals.has(match)) {
      seenOriginals.add(match)
      results.push({
        type: 'GSTIN',
        original: match,
        masked: `${cleanGst.slice(0, 2)}XXXXX${cleanGst.slice(7)}`,
        icon: 'Building2',
        severity: 'medium',
        riskLevel: 'Medium Risk (Tax ID)',
      })
    }
  }

  // 4. Phone numbers
  const phoneMatches = text.match(PII_PATTERNS.phone) || []
  for (const match of phoneMatches) {
    const cleanPhone = match.replace(/[\s-]/g, '')
    if (cleanPhone.length >= 10 && !seenOriginals.has(match)) {
      seenOriginals.add(match)
      results.push({
        type: 'Phone Number',
        original: match,
        masked: `XXXXXX${cleanPhone.slice(-4)}`,
        icon: 'Phone',
        severity: 'medium',
        riskLevel: 'Medium Risk (Personal Contact)',
      })
    }
  }

  // 5. Email addresses
  const emailMatches = text.match(PII_PATTERNS.email) || []
  for (const match of emailMatches) {
    if (!seenOriginals.has(match)) {
      seenOriginals.add(match)
      const [local, domain] = match.split('@')
      results.push({
        type: 'Email Address',
        original: match,
        masked: `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}@${domain}`,
        icon: 'Mail',
        severity: 'medium',
        riskLevel: 'Medium Risk (Personal Contact)',
      })
    }
  }

  // 6. Voter ID
  const voterMatches = text.match(PII_PATTERNS.voterId) || []
  for (const match of voterMatches) {
    const clean = match.replace(/[\s-]/g, '').toUpperCase()
    if (clean.length === 10 && !seenOriginals.has(match)) {
      seenOriginals.add(match)
      results.push({
        type: 'Voter ID',
        original: match,
        masked: `${clean.slice(0, 3)}XXXX${clean.slice(-3)}`,
        icon: 'Shield',
        severity: 'medium',
        riskLevel: 'Medium Risk (Voter Identification)',
      })
    }
  }

  // 7. Passport
  const passportMatches = text.match(PII_PATTERNS.passport) || []
  for (const match of passportMatches) {
    const clean = match.replace(/[\s-]/g, '').toUpperCase()
    if (clean.length === 8 && !seenOriginals.has(match)) {
      seenOriginals.add(match)
      results.push({
        type: 'Passport',
        original: match,
        masked: `${clean[0]}XXXX${clean.slice(-3)}`,
        icon: 'Shield',
        severity: 'high',
        riskLevel: 'High Risk (Travel Document)',
      })
    }
  }

  return results
}

/**
 * Replaces detected PII in text with standardized redaction tokens.
 */
export function maskPII(rawText) {
  if (!rawText || typeof rawText !== 'string') return rawText

  let text = normalizeTextForPII(rawText)

  // Redact Aadhaar (12-digit numbers)
  text = text.replace(PII_PATTERNS.aadhaar, (match) => {
    const digits = match.replace(/[\s-]/g, '')
    if (digits.length === 12 && !/^(\d)\1{11}$/.test(digits)) {
      return '[AADHAAR_REDACTED]'
    }
    return match
  })

  // Redact PAN Card
  text = text.replace(PII_PATTERNS.pan, (match) => {
    const clean = match.replace(/[\s-]/g, '')
    if (clean.length === 10) return '[PAN_REDACTED]'
    return match
  })

  // Redact GSTIN
  text = text.replace(PII_PATTERNS.gstin, '[GST_REDACTED]')

  // Redact Phone numbers
  text = text.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]')

  // Redact Email addresses
  text = text.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]')

  // Redact Voter ID
  text = text.replace(PII_PATTERNS.voterId, '[VOTERID_REDACTED]')

  // Redact Passport
  text = text.replace(PII_PATTERNS.passport, '[PASSPORT_REDACTED]')

  return text
}

/**
 * Pre-flight sanitizer for external AI processing.
 * Normalizes text, redacts sensitive PII, and performs a fail-safe verification.
 * If unmaskable sensitive patterns are detected, returns a safe failure response.
 */
export function sanitizeForAI(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { success: true, text: '', piiCount: 0 }
  }

  const detectedItems = detectPII(rawText)
  const maskedText = maskPII(rawText)

  // Fail-safe post-check: verify whether high-risk Aadhaar/PAN formats remain unredacted
  const residualAadhaar = maskedText.match(/\b\d{4}\s\d{4}\s\d{4}\b/)
  const residualPan = maskedText.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)

  if (residualAadhaar || residualPan) {
    // Redaction failed to fully sanitize — fail-soft without sending raw PII
    return {
      success: false,
      error: 'Sensitive information could not be safely redacted. AI processing was skipped.',
      piiCount: detectedItems.length,
    }
  }

  return {
    success: true,
    text: maskedText,
    piiCount: detectedItems.length,
    detectedItems,
  }
}
