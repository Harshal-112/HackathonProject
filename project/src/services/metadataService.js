// ---------------------------------------------------------------------------
// metadataService.js — Enhanced rule-based metadata extraction
//
// Improvements:
//   1. Full 36 Maharashtra districts in location hints
//   2. Better date patterns — Indian format "15 August 2026", ordinal dates
//   3. Person name extraction using common Indian name patterns
//   4. Address extraction with pin code detection
//   5. PAN / GST / Aadhaar pattern detection
//   6. Hindi-specific language detection (separate from Marathi)
//   7. Better title extraction (prefer ALL-CAPS lines, skip noise lines)
//   8. Expanded organization keyword hints
// ---------------------------------------------------------------------------

const DEVANAGARI_REGEX = /[\u0900-\u097F]/g

// Enhanced date regex — covers:
//   DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
//   D Month YYYY, Month D YYYY
//   Devanagari month names
const DATE_REGEX_NUMERIC = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g
const DATE_REGEX_TEXT = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/gi
const DATE_REGEX_TEXT_ALT = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi

const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8,
  sep: 9, oct: 10, nov: 11, dec: 12,
}

// All 36 Maharashtra districts + major cities + common towns
const LOCATION_HINTS = [
  // Districts
  'Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati',
  'Kolhapur', 'Sangli', 'Satara', 'Ratnagiri', 'Sindhudurg', 'Raigad',
  'Thane', 'Palghar', 'Ahmednagar', 'Dhule', 'Jalgaon', 'Nandurbar',
  'Buldhana', 'Akola', 'Washim', 'Yavatmal', 'Wardha', 'Chandrapur',
  'Gadchiroli', 'Gondia', 'Bhandara', 'Osmanabad', 'Latur', 'Nanded',
  'Hingoli', 'Parbhani', 'Jalna', 'Beed',
  // Common towns
  'Ganeshkhind', 'Hadapsar', 'Kothrud', 'Shivajinagar', 'Vashi',
  'Borivali', 'Andheri', 'Dadar', 'Pimpri', 'Chinchwad', 'Baramati',
  'Pandharpur', 'Shirdi', 'Mahabaleshwar', 'Lonavala', 'Alibag',
  // Marathi names
  'पुणे', 'मुंबई', 'नागपूर', 'नाशिक', 'औरंगाबाद', 'सोलापूर',
]

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_REGEX = /\b(?:\+91[-\s]?)?(?:\(0\d{2,4}\)[-\s]?)?\d{4,5}[-\s]?\d{4,6}\b/g
const REFERENCE_REGEX = /\b(?:[A-Z]{1,5}[-\/]?\d{2,10}|[A-Z]{1,5}\/[A-Z]{1,5}\/\d{2,10})\b/g

// Indian document numbers
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/g
const GST_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g
const AADHAAR_REGEX = /\b\d{4}\s\d{4}\s\d{4}\b/g
const PINCODE_REGEX = /\b[1-9]\d{5}\b/g

// Common Indian first/last name patterns
const COMMON_INDIAN_TITLES = /\b(Shri|Smt|Ku|Dr|Prof|Adv|Er|Col|Maj|Capt|श्री|श्रीमती|कु\.?)\b/gi
const NAME_AFTER_TITLE = /(?:Shri|Smt|Ku|Dr|Prof|Adv|श्री|श्रीमती|कु\.?)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/gi

// ---------------------------------------------------------------------------
// Language detection — differentiate Hindi vs Marathi using distinctive chars
// ---------------------------------------------------------------------------
export function detectLanguage(text) {
  const devChars = (text.match(/[\u0900-\u097F]/g) || []).length
  const engChars = (text.match(/[A-Za-z]/g) || []).length

  // Marathi-specific words
  const marathiWords = (text.match(/\b(आहे|असे|होते|करणे|महाराष्ट्र|पंचायत|ग्राम|तहसील|जिल्हा|विभाग)\b/g) || []).length
  // Hindi-specific words
  const hindiWords = (text.match(/\b(है|हैं|था|होना|करना|राज्य|सरकार|भारत|केंद्र|दिल्ली)\b/g) || []).length

  if (devChars > 20 && engChars > 20) {
    if (marathiWords >= hindiWords) return 'Marathi + English'
    return 'Hindi + English'
  }
  if (devChars > engChars) {
    if (marathiWords >= hindiWords) return 'Marathi'
    return 'Hindi'
  }
  if (engChars > devChars) return 'English'
  return 'Mixed'
}

// ---------------------------------------------------------------------------
// Date extraction — numeric + text formats
// ---------------------------------------------------------------------------
export function extractDates(text) {
  const currentYear = new Date().getFullYear()
  const dates = []

  // Numeric dates: DD/MM/YYYY
  for (const [raw, d, m, y] of [...text.matchAll(DATE_REGEX_NUMERIC)]) {
    const year = parseInt(y, 10)
    const month = parseInt(m, 10)
    const day = parseInt(d, 10)
    const plausible = year >= currentYear - 15 && year <= currentYear + 5
      && month >= 1 && month <= 12 && day >= 1 && day <= 31
    const iso = plausible
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    dates.push({ raw, iso, flaggedForReview: !plausible })
  }

  // Text dates: "15 August 2026"
  for (const [raw, d, monthStr, y] of [...text.matchAll(DATE_REGEX_TEXT)]) {
    const month = MONTH_MAP[monthStr.toLowerCase()]
    if (!month) continue
    const year = parseInt(y, 10)
    const day = parseInt(d, 10)
    const plausible = year >= currentYear - 15 && year <= currentYear + 5
    const iso = plausible
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    dates.push({ raw, iso, flaggedForReview: !plausible })
  }

  // Text dates alt: "August 15, 2026"
  for (const [raw, monthStr, d, y] of [...text.matchAll(DATE_REGEX_TEXT_ALT)]) {
    const month = MONTH_MAP[monthStr.toLowerCase()]
    if (!month) continue
    const year = parseInt(y, 10)
    const day = parseInt(d, 10)
    const plausible = year >= currentYear - 15 && year <= currentYear + 5
    const iso = plausible
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    dates.push({ raw, iso, flaggedForReview: !plausible })
  }

  // Deduplicate by ISO date
  const seen = new Set()
  return dates.filter(d => {
    if (!d.iso) return true
    if (seen.has(d.iso)) return false
    seen.add(d.iso)
    return true
  })
}

// ---------------------------------------------------------------------------
// Location extraction
// ---------------------------------------------------------------------------
export function extractLocations(text) {
  return LOCATION_HINTS.filter((loc) => {
    // Case-insensitive search for English locations
    if (/^[A-Za-z]/.test(loc)) {
      return text.toLowerCase().includes(loc.toLowerCase())
    }
    return text.includes(loc)
  })
}

// ---------------------------------------------------------------------------
// Contact info extraction
// ---------------------------------------------------------------------------
export function extractEmails(text) {
  return [...new Set(text.match(EMAIL_REGEX) || [])]
}

export function extractPhones(text) {
  const raw = text.match(PHONE_REGEX) || []
  // Filter out numbers that look like dates or years (4-digit, etc.)
  return [...new Set(raw.filter(p => p.replace(/\D/g, '').length >= 8))]
}

export function extractReferenceNumbers(text) {
  return [...new Set(text.match(REFERENCE_REGEX) || [])]
}

// ---------------------------------------------------------------------------
// New: Special document numbers
// ---------------------------------------------------------------------------
export function extractPAN(text) {
  return [...new Set(text.match(PAN_REGEX) || [])]
}

export function extractGST(text) {
  return [...new Set(text.match(GST_REGEX) || [])]
}

export function extractAadhaar(text) {
  // Return with last 4 visible, rest masked (privacy)
  return (text.match(AADHAAR_REGEX) || []).map(a => {
    const digits = a.replace(/\s/g, '')
    return `XXXX XXXX ${digits.slice(-4)}`
  })
}

export function extractPincodes(text) {
  return [...new Set(text.match(PINCODE_REGEX) || [])]
}

// ---------------------------------------------------------------------------
// Person name extraction
// ---------------------------------------------------------------------------
export function extractPersonNames(text) {
  const names = []

  // Method 1: Names after honorifics (Shri, Smt, Dr, etc.)
  for (const [, name] of [...text.matchAll(NAME_AFTER_TITLE)]) {
    names.push(name.trim())
  }

  // Method 2: Lines with "Name:" or "नाव:" patterns
  const nameLineMatch = text.match(/(?:Name|नाव|नाम)\s*[:：]\s*([A-Za-z\u0900-\u097F\s]{3,50})/)
  if (nameLineMatch) {
    names.push(nameLineMatch[1].trim())
  }

  return [...new Set(names.filter(n => n.length >= 4))]
}

// ---------------------------------------------------------------------------
// Address extraction
// ---------------------------------------------------------------------------
export function extractAddresses(text) {
  const addresses = []
  const lines = text.split('\n').map(l => l.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Look for pin codes as anchor
    if (PINCODE_REGEX.test(line) && line.length > 8) {
      // Grab 2 lines before + current as full address
      const addrLines = [
        i > 0 ? lines[i - 1] : '',
        line,
      ].filter(Boolean)
      addresses.push(addrLines.join(', '))
    }
    // Reset regex lastIndex
    PINCODE_REGEX.lastIndex = 0
  }

  return [...new Set(addresses)]
}

// ---------------------------------------------------------------------------
// Title extraction — improved
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Title extraction — improved for English + Marathi/Hindi
// ---------------------------------------------------------------------------
export function extractTitle(text) {
  // 1. Check for explicit Subject line in English or Marathi/Hindi
  // (e.g., "Subject:", "विषय:", "विषय-", "विषय :-", "बाबत:")
  const subjectMatch = text.match(/(?:Subject|Sub|विषय|विषयः|बाबतीत)\s*[:：\-–]?\s*[-–]?\s*(.+)/i)
  if (subjectMatch && subjectMatch[1].trim().length >= 6) {
    let clean = subjectMatch[1].trim()
      .replace(/^(?:बाबत|संदर्भात)\s*[:：\-–]?\s*/i, '')
      .replace(/Page\s+\d+.*$/i, '')
      .replace(/\s+/g, ' ')
    if (clean.length >= 6) return clean.slice(0, 140)
  }

  // 2. Check for Marathi lines ending with "बाबत" or "संदर्भात" (standard Marathi subject line format)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (/(?:बाबत|संदर्भात|अहवाल|प्रस्ताव|जाहीर प्रकटन|परिपत्रक)[.।]?$/i.test(line) && line.length >= 10 && line.length <= 150) {
      return line.replace(/[.।]+$/, '').trim()
    }
  }

  // 3. For English lines: prefer ALL-CAPS lines (government document headings)
  // Only apply to lines with ASCII letters /[A-Z]/, NOT pure Devanagari lines
  for (const line of lines) {
    if (
      /[A-Za-z]/.test(line) &&
      line === line.toUpperCase() &&
      line.length >= 10 &&
      line.length <= 120 &&
      !/^\d/.test(line) &&
      !/[0-9]{4}/.test(line)
    ) {
      if (!/(?:university|government|department|collector|panchayat|corporation|ministry)/i.test(line)) {
        return line
      }
    }
  }

  // 4. Fallback: substantial line passing quality filters (skipping known org header lines)
  const KNOWN_ORG_PATTERNS = /(?:सावित्रीबाई|पुणे विद्यापीठ|महाराष्ट्र शासन|जिल्हाधिकारी|ग्रामपंचायत|महानगरपालिका|Government of|University of|Department of|Collector Office)/i

  for (let line of lines) {
    let clean = line
      .replace(/^[^A-Za-z\u0900-\u097F]+/, '')
      .replace(/^[il]\s+/i, '')
      .replace(/Page\s+\d+.*$/i, '')
      .trim()

    if (clean.length < 12 || clean.length > 140) continue
    if (/^(?:page|date|email|outward|reference|क्रमांक|दिनांक|जावक|पत्ता|दि\.)/i.test(clean)) continue
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(clean)) continue
    if (/https?:\/\/|www\.|\.(?:com|in|org|net)\b/i.test(clean)) continue
    if (KNOWN_ORG_PATTERNS.test(clean)) continue // Skip org header lines to avoid using them as title

    return clean
  }

  return ''
}

// ---------------------------------------------------------------------------
// Organization extraction — expanded keywords
// ---------------------------------------------------------------------------
export function extractOrganization(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const knownNames = [
    /Savitribai Phule Pune University/i,
    /University of Pune/i,
    /Government of Maharashtra/i,
    /Maharashtra Public Service Commission/i,
    /Income Tax Department/i,
    /Reserve Bank of India/i,
    /State Bank of India/i,
    /Unique Identification Authority/i,
    /Election Commission/i,
    /Maharashtra State Board/i,
    /Central Board/i,
    /Food Corporation/i,
    /Maharashtra Revenue Department/i,
  ]

  for (const line of lines) {
    for (const pattern of knownNames) {
      if (pattern.test(line)) return line
    }
  }

  const officeKeywords = /(कार्यालय|विभाग|पंचायत|महाविद्यालय|विद्यापीठ|तहसील|जिल्हा परिषद|महालेखापाल|शासन|सरकार|office|department|collector|university|college|authority|commission|corporation|municipal|panchayat|taluka|district)/i

  for (const line of lines) {
    if (officeKeywords.test(line) && line.length >= 5 && line.length <= 120) {
      return line
    }
  }

  return ''
}

// ---------------------------------------------------------------------------
// Subject extraction
// ---------------------------------------------------------------------------
export function extractSubject(text) {
  const match = text.match(/(?:Subject|Sub|विषय|विषयः)\s*[:：]?\s*[-–]?\s*(.+)/i)
  return match ? match[1].trim() : ''
}

// ---------------------------------------------------------------------------
// Post/Designation extraction
// ---------------------------------------------------------------------------
export function extractPost(text) {
  const match = text.match(/(?:Post|Designation|पद|पदनाम)\s*[:：]?\s*(.+)/i)
  return match ? match[1].trim().slice(0, 80) : ''
}

// ---------------------------------------------------------------------------
// Document number extraction
// ---------------------------------------------------------------------------
export function extractDocumentNumber(text) {
  const patterns = [
    /Outward\s*No\.?\s*:\s*([A-Za-z]{1,5}\s*\/\s*\d+)/i,
    /(?:जा\.?\s*क्र\.?|जावक\s*क्रमांक|क्रमांक)\s*[:：]?\s*([A-Za-z0-9\u0900-\u097F\/\-]{2,30})/,
    /No\.?\s*[:：]\s*([A-Z]{1,5}[\/\-]\d{2,15})/i,
    /Letter\s*No\.?\s*[:：]\s*([A-Z0-9\/\-]{3,20})/i,
    /Case\s*No\.?\s*[:：]\s*([A-Z0-9\/\-]{3,20})/i,
    /File\s*No\.?\s*[:：]\s*([A-Z0-9\/\-]{3,20})/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1].replace(/\s+/g, '')
  }

  return ''
}

// ---------------------------------------------------------------------------
// Main: generateMetadata
// ---------------------------------------------------------------------------
export function generateMetadata(fullText) {
  const dates = extractDates(fullText)
  const locations = extractLocations(fullText)

  return {
    title: extractTitle(fullText),
    organization: extractOrganization(fullText),
    subject: extractSubject(fullText),
    post: extractPost(fullText),
    documentNumber: extractDocumentNumber(fullText),
    language: detectLanguage(fullText),

    importantDates: dates.filter((d) => d.iso).map((d) => d.iso),
    flaggedDates: dates.filter((d) => d.flaggedForReview).map((d) => d.raw),

    location: locations[0] || null,
    locations,

    emails: extractEmails(fullText),
    phones: extractPhones(fullText),
    referenceNumbers: extractReferenceNumbers(fullText),
    personNames: extractPersonNames(fullText),
    addresses: extractAddresses(fullText),

    // New document number types
    panNumbers: extractPAN(fullText),
    gstNumbers: extractGST(fullText),
    aadhaarNumbers: extractAadhaar(fullText),
    pincodes: extractPincodes(fullText),
  }
}
