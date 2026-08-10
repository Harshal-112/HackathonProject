// ---------------------------------------------------------------------------
// smartSearch.js
//
// A completely free, client-side "smart search" engine. It does NOT call any
// external AI/LLM API — everything runs in the browser using plain JS. It's
// "smart" in two ways:
//
//   1. Entity extraction: it understands query fragments like "urgent",
//      "from Revenue Department", "pending", "land documents", "this week",
//      "in January" and turns them into real filters instead of treating
//      the whole query as one dumb substring match.
//
//   2. Relevance scoring: whatever text is left after filters are pulled out
//      gets scored against title / OCR text / metadata with weighted fields
//      and light typo-tolerance (Levenshtein distance), so results are
//      RANKED by relevance instead of just "contains string Y/N".
//
// This replaces the old `.includes()` only search in mock-api.js.
// ---------------------------------------------------------------------------

// --- small utilities --------------------------------------------------------

function levenshtein(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      )
    }
  }
  return dp[m][n]
}

function fuzzyIncludes(haystackWords, needle) {
  // exact / substring match first (cheap + accurate)
  if (haystackWords.some((w) => w.includes(needle))) return true
  // typo tolerance only for longer words, otherwise everything "matches"
  if (needle.length < 4) return false
  return haystackWords.some((w) => w.length >= 4 && levenshtein(w, needle) <= 1)
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

const STATUS_SYNONYMS = {
  pending: 'pending', waiting: 'pending', review: 'pending', 'in review': 'pending',
  approved: 'approved', cleared: 'approved', accepted: 'approved',
  rejected: 'rejected', declined: 'rejected', denied: 'rejected',
  draft: 'draft',
  archived: 'archived',
  changes: 'changes', 'changes requested': 'changes',
}

const PRIORITY_SYNONYMS = {
  urgent: 'urgent', critical: 'urgent', emergency: 'urgent', asap: 'urgent',
  high: 'high', important: 'high',
  medium: 'medium', normal: 'medium',
  low: 'low',
}

// --- date range parsing ------------------------------------------------------

function parseDateRange(qLower) {
  const now = new Date()
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  if (qLower.includes('today')) {
    return { start: startOfDay(now), end: endOfDay(now) }
  }
  if (qLower.includes('yesterday')) {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    return { start: startOfDay(y), end: endOfDay(y) }
  }
  if (qLower.includes('this week')) {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay())
    return { start: startOfDay(start), end: endOfDay(now) }
  }
  if (qLower.includes('last week')) {
    const end = new Date(now); end.setDate(now.getDate() - now.getDay() - 1)
    const start = new Date(end); start.setDate(end.getDate() - 6)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  if (qLower.includes('this month')) {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) }
  }
  if (qLower.includes('last month')) {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    }
  }
  for (let i = 0; i < MONTHS.length; i++) {
    if (qLower.includes(MONTHS[i])) {
      const yearMatch = qLower.match(/\b(20\d{2})\b/)
      const year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear()
      return {
        start: new Date(year, i, 1),
        end: new Date(year, i + 1, 0, 23, 59, 59, 999),
      }
    }
  }
  return null
}

// --- entity extraction -------------------------------------------------------

/**
 * Turns a free-text query into structured filters + leftover keyword text.
 * lookups = { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES } (from mock-data.js)
 */
export function parseQuery(query, lookups) {
  const { DEPARTMENTS = [], CATEGORIES = [], PRIORITIES = [], DOC_STATUSES = [] } = lookups || {}
  let remaining = ` ${query.toLowerCase().trim()} `
  const filters = {}

  const strip = (phrase) => {
    remaining = remaining.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ')
  }

  // department: match full name or id
  for (const d of DEPARTMENTS) {
    if (remaining.includes(d.name.toLowerCase())) { filters.department = d.id; strip(d.name.toLowerCase()); break }
    if (remaining.includes(d.id)) { filters.department = d.id; strip(d.id); break }
  }

  // category
  for (const c of CATEGORIES) {
    if (remaining.includes(c.name.toLowerCase())) { filters.category = c.id; strip(c.name.toLowerCase()); break }
    if (remaining.includes(c.id)) { filters.category = c.id; strip(c.id); break }
  }

  // priority (with synonyms)
  for (const word of Object.keys(PRIORITY_SYNONYMS)) {
    if (remaining.includes(word)) { filters.priority = PRIORITY_SYNONYMS[word]; strip(word); break }
  }

  // status (with synonyms) — only if it maps to a real status id
  const validStatusIds = new Set(DOC_STATUSES.map((s) => s.id))
  for (const word of Object.keys(STATUS_SYNONYMS)) {
    const mapped = STATUS_SYNONYMS[word]
    if (remaining.includes(word) && validStatusIds.has(mapped)) {
      filters.status = mapped; strip(word); break
    }
  }

  // date range
  const dateRange = parseDateRange(remaining)
  if (dateRange) {
    filters.dateRange = dateRange
    for (const phrase of ['today', 'yesterday', 'this week', 'last week', 'this month', 'last month', ...MONTHS]) {
      strip(phrase)
    }
    remaining = remaining.replace(/\b(in|during|on)\b/g, ' ')
  }

  // filler words that don't help keyword scoring
  remaining = remaining.replace(/\b(show|find|list|all|documents?|files?|from|the|a|an|for|with|of|me)\b/g, ' ')
  remaining = remaining.replace(/\s+/g, ' ').trim()

  return { filters, keywords: remaining }
}

// --- scoring -----------------------------------------------------------------

function inRange(dateStr, range) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return d >= range.start && d <= range.end
}

/**
 * Scores a single document against a parsed query. Returns -1 if the doc is
 * excluded by a hard filter (department/category/priority/status/date),
 * otherwise a non-negative relevance score.
 */
export function scoreDocument(doc, parsed) {
  const { filters, keywords } = parsed

  if (filters.department && doc.department !== filters.department) return -1
  if (filters.category && doc.category !== filters.category) return -1
  if (filters.priority && doc.priority !== filters.priority) return -1
  if (filters.status && doc.status !== filters.status) return -1
  if (filters.dateRange && !inRange(doc.createdAt, filters.dateRange)) return -1

  let score = Object.keys(filters).length * 5 // base score just for matching filters

  if (!keywords) return score + 1 // pure filter query — every match is equally relevant

  const words = keywords.split(' ').filter((w) => w.length >= 2)
  if (words.length === 0) return score + 1

  const titleWords = (doc.title || '').toLowerCase().split(/\s+/)
  const tagWords = [
    ...(doc.metadata?.tags || []),
    ...(doc.metadata?.keywords || []),
    ...(doc.metadata?.personNames || []),
  ].map((w) => String(w).toLowerCase())
  const ocrLower = (doc.ocrText || '').toLowerCase()
  const summaryLower = (doc.metadata?.summary || '').toLowerCase()
  const docNumberLower = (doc.documentNumber || '').toLowerCase()

  let matchedAny = false
  for (const word of words) {
    if (titleWords.some((w) => w.includes(word))) { score += 10; matchedAny = true; continue }
    if (docNumberLower.includes(word)) { score += 8; matchedAny = true; continue }
    if (tagWords.some((w) => w.includes(word))) { score += 6; matchedAny = true; continue }
    if (summaryLower.includes(word)) { score += 4; matchedAny = true; continue }
    if (ocrLower.includes(word)) { score += 3; matchedAny = true; continue }
    if (fuzzyIncludes(titleWords, word) || fuzzyIncludes(tagWords, word)) { score += 2; matchedAny = true; continue }
  }

  // whole-phrase bonus (e.g. searching the exact title fragment)
  if (titleWords.length && (doc.title || '').toLowerCase().includes(keywords)) score += 15

  if (!matchedAny) return -1
  return score
}

function extractSnippet(doc, keywords) {
  if (!doc) return ''
  const summary = doc.metadata?.summary
  if (summary && summary.trim()) return summary

  const ocr = doc.ocrText || ''
  if (!ocr || !keywords) return ocr.slice(0, 150) + (ocr.length > 150 ? '...' : '')

  const words = keywords.split(' ').filter((w) => w.length >= 2)
  for (const w of words) {
    const idx = ocr.toLowerCase().indexOf(w.toLowerCase())
    if (idx !== -1) {
      const start = Math.max(0, idx - 40)
      const end = Math.min(ocr.length, idx + 110)
      let snippet = ocr.slice(start, end).replace(/\s+/g, ' ')
      if (start > 0) snippet = '...' + snippet
      if (end < ocr.length) snippet += '...'
      return snippet
    }
  }

  return ocr.slice(0, 150) + (ocr.length > 150 ? '...' : '')
}

/**
 * Main entry point. Returns docs sorted by relevance (most relevant first).
 */
export function smartSearch(docs, query, lookups) {
  const parsed = parseQuery(query, lookups)
  return docs
    .map((doc) => {
      const score = scoreDocument(doc, parsed)
      return { doc: { ...doc, snippet: extractSnippet(doc, parsed.keywords) }, score }
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || new Date(b.doc.createdAt) - new Date(a.doc.createdAt))
    .map(({ doc }) => doc)
}
