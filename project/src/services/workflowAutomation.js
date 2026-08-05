// ---------------------------------------------------------------------------
// workflowAutomation.js
//
// Free, rule-based workflow automation — no external API, no paid service.
// Uses the OCR text + the existing documentClassifier.js output to:
//
//   1. Auto-assign a CATEGORIES id (previously this fell back to a RANDOM
//      category when nothing was picked manually — see mock-api.js line
//      ~248 in the original code).
//   2. Auto-assign a DEPARTMENT id based on classified doc type + keyword
//      hints in the OCR text (previously always required manual selection
//      or fell back to the uploader's own department).
//   3. Auto-assign a PRIORITY based on urgency keywords (English + Marathi/
//      Hindi) and how close any detected date is to today (previously
//      random).
//   4. Flag documents as "overdue" for the approvals queue based on how
//      long they've sat pending, scaled by priority — this is the
//      "efficient workflow management" piece: reviewers see what needs
//      attention first without anyone manually chasing it down.
//
// Every decision returns a human-readable `reason`, so the UI/demo can show
// *why* something was auto-routed — good for judges, good for trust.
// ---------------------------------------------------------------------------

// classifyDocument()'s `category` field -> real CATEGORIES id used by the DB/UI.
// (CATEGORIES ids are: land, license, certificate, application, notice,
// register, report, correspondence — see src/lib/mock-data.js)
const CLASSIFIER_TYPE_TO_CATEGORY_ID = {
  'Invoice': 'report',
  'Aadhaar Card': 'certificate',
  'Passport': 'certificate',
  'University Document': 'certificate',
  'Certificate': 'certificate',
  'Government Order/Letter': 'notice',
  'Other': 'correspondence',
}

// classifyDocument()'s broad `category` -> best-guess DEPARTMENTS id.
// Feel free to tune these to match your actual demo documents.
const CLASSIFIER_CATEGORY_TO_DEPARTMENT_ID = {
  Finance: 'revenue',
  Identity: 'collector',
  Education: 'education',
  Administration: 'collector',
  General: 'collector',
}

// Extra keyword hints checked directly against the OCR text — these win over
// the broad category mapping above when present, because they're more
// specific.
const DEPARTMENT_KEYWORD_HINTS = [
  { dept: 'rto', words: ['rto', 'transport', 'driving licence', 'driving license', 'vehicle registration', 'वाहन'] },
  { dept: 'revenue', words: ['7/12', 'satbara', 'land record', 'revenue department', 'महसूल'] },
  { dept: 'municipal', words: ['municipal corporation', 'municipal', 'नगरपालिका', 'महानगरपालिका'] },
  { dept: 'panchayat', words: ['gram panchayat', 'ग्रामपंचायत', 'पंचायत'] },
  { dept: 'health', words: ['health department', 'hospital', 'phc', 'आरोग्य'] },
  { dept: 'agri', words: ['agriculture', 'crop', 'farmer', 'कृषी', 'शेतकरी'] },
  { dept: 'education', words: ['university', 'college', 'school', 'शिक्षण', 'विद्यापीठ', 'महाविद्यालय'] },
]

const URGENT_KEYWORDS = [
  'urgent', 'immediately', 'asap', 'emergency', 'time-sensitive', 'time sensitive',
  'तातडीने', 'तात्काळ', 'अत्यावश्यक', 'जरूरी', 'तुरंत',
]

/**
 * @param {{type:string, category:string, confidence:number}} classification - output of classifyDocument()
 * @param {string} ocrText - full OCR text
 * @param {Array<{iso:string|null, flaggedForReview:boolean}>} importantDates - output of metadataService.extractDates()
 * @returns {{category:string, department:string, priority:string, reason:string[]}}
 */
export function autoRouteDocument({ classification, ocrText = '', importantDates = [] }) {
  const reason = []
  const textLower = ocrText.toLowerCase()

  // 1. category
  const category = CLASSIFIER_TYPE_TO_CATEGORY_ID[classification?.type] || 'correspondence'
  reason.push(`Classified as "${classification?.type || 'Other'}" (${classification?.confidence ?? 0}% confidence) → filed under "${category}"`)

  // 2. department — keyword hints first, broad category as fallback
  let department = null
  for (const hint of DEPARTMENT_KEYWORD_HINTS) {
    if (hint.words.some((w) => textLower.includes(w))) {
      department = hint.dept
      reason.push(`Detected "${hint.words.find((w) => textLower.includes(w))}" in text → routed to ${hint.dept} department`)
      break
    }
  }
  if (!department) {
    department = CLASSIFIER_CATEGORY_TO_DEPARTMENT_ID[classification?.category] || 'collector'
    reason.push(`No department keyword found; defaulted based on document category "${classification?.category || 'General'}"`)
  }

  // 3. priority
  let priority = 'medium'
  const urgentHit = URGENT_KEYWORDS.find((w) => textLower.includes(w))
  if (urgentHit) {
    priority = 'urgent'
    reason.push(`Urgency keyword "${urgentHit}" found in document text`)
  } else {
    const soonDate = importantDates
      .filter((d) => d.iso && !d.flaggedForReview)
      .map((d) => new Date(d.iso))
      .filter((d) => !isNaN(d))
      .sort((a, b) => a - b)[0]
    if (soonDate) {
      const daysAway = Math.ceil((soonDate - new Date()) / (1000 * 60 * 60 * 24))
      if (daysAway >= 0 && daysAway <= 3) {
        priority = 'high'
        reason.push(`A date in the document (${soonDate.toDateString()}) is within ${daysAway} day(s)`)
      }
    }
  }
  if (priority === 'medium') reason.push('No urgency signals found; defaulted to medium priority')

  return { category, department, priority, reason }
}

// --- overdue / escalation for the approvals queue ---------------------------

// Days a pending document is allowed to sit before it's flagged, per priority.
const OVERDUE_THRESHOLD_DAYS = { urgent: 1, high: 2, medium: 5, low: 10 }

/**
 * @param {{status:string, priority:string, createdAt:string}} doc
 * @returns {boolean}
 */
export function isOverdue(doc) {
  if (doc.status !== 'pending') return false
  const thresholdDays = OVERDUE_THRESHOLD_DAYS[doc.priority] ?? 5
  const ageMs = Date.now() - new Date(doc.createdAt).getTime()
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000
}

/**
 * Sorts pending approvals so overdue items surface first (most overdue first),
 * then by priority, then by age. Pure client-side, no schema changes needed.
 */
export function sortApprovalsByUrgency(docs) {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 }
  return [...docs].sort((a, b) => {
    const aOverdue = isOverdue(a)
    const bOverdue = isOverdue(b)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    const rankDiff = (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2)
    if (rankDiff !== 0) return rankDiff
    return new Date(a.createdAt) - new Date(b.createdAt)
  })
}
