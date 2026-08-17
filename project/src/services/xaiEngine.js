// ---------------------------------------------------------------------------
// xaiEngine.js — Explainable AI (XAI) Engine & Decision Transparency Service
//
// Provides transparent, reproducible, and deterministic explanations for:
//   1. Feature Contribution Analysis (5 fixed weighted features = 100%)
//   2. Decision Trace (Observable event steps)
//   3. Classification Mechanism Consensus (Rule Engine vs AI Engine)
//   4. Overall Decision Confidence & Action Recommendations
//   5. Separate Department Routing Explanation
//   6. Independent PII Detection & Protection Utilities
// ---------------------------------------------------------------------------

// Centralized Feature Weights (Must sum to exactly 1.00 / 100%)
export const FEATURE_WEIGHTS = {
  title: 0.30,        // 30% Document Title Match
  keywords: 0.25,     // 25% Keyword Density
  organization: 0.20, // 20% Issuing Organization
  ocrQuality: 0.15,   // 15% OCR Quality/Confidence
  dateSignals: 0.10,  // 10% Date & Urgency Signals
}

// Configurable Confidence & Action Thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW_ACTION_TRIGGER: 60, // Threshold below which MANUAL REVIEW REQUIRED is triggered
}

// Configurable Engine Disagreement Threshold
export const DISAGREEMENT_DELTA_THRESHOLD = 20

// Document pattern dictionaries for evidence verification
const PATTERN_DICT = {
  'Land Record (7/12)': ['7/12', 'सातबारा', 'land', 'जमीन', 'survey', 'plot', 'भूखंड', 'खाते', 'गट नंबर', 'खसरा'],
  'Aadhaar Card': ['aadhaar', 'aadhar', 'uidai', 'unique identification', 'आधार', 'विशिष्ट ओळख'],
  'PAN Card': ['pan', 'permanent account number', 'income tax department', 'कायमस्वरूपी खाते'],
  'Passport': ['passport', 'republic of india', 'ministry of external affairs', 'पारपत्र'],
  'Government Order/Letter': ['government order', 'corrigendum', 'circular', 'resolution', 'gr', 'महाराष्ट्र शासन', 'शासन निर्णय', 'शुद्धिपत्रक', 'शुद्धीपत्रक', 'परिपत्रक', 'आरोग्य विभाग', 'अध्यादेश'],
  'Court Order': ['court', 'high court', 'district court', 'supreme court', 'judgment', 'judgement', 'petitioner', 'respondent', 'न्यायालय', 'कोर्ट', 'याचिका'],
  'Invoice': ['invoice', 'gstin', 'tax invoice', 'bill', 'पावती', 'बिल', 'देयक'],
  'Caste Certificate': ['caste', 'caste validity', 'obc', 'sc', 'st', 'जात प्रमाणपत्र', 'जात पडताळणी'],
  'Income Certificate': ['income certificate', 'annual income', 'उत्पन्न प्रमाणपत्र'],
  'Domicile Certificate': ['domicile', 'residence certificate', 'रहिवाशी प्रमाणपत्र'],
  'Affidavit': ['affidavit', 'notary', 'notarized', 'प्रतिज्ञापत्र', 'शपथपत्र'],
  'FIR': ['first information report', 'fir', 'police station', 'प्रथम सूचना अहवाल', 'पोलिस ठाणे'],
  'University Document': ['university', 'college', 'degree', 'marksheet', 'विद्यापीठ', 'महाविद्यालय', 'गुणपत्रिका'],
}

// Department name lookup
const DEPT_NAMES = {
  revenue: 'Revenue Department',
  rto: 'Transport (RTO)',
  municipal: 'Municipal Corporation',
  panchayat: 'Gram Panchayat',
  collector: "Collector's Office",
  health: 'Health Department',
  education: 'Education Department',
  agri: 'Agriculture Department',
}

// ---------------------------------------------------------------------------
// 1. FEATURE CONTRIBUTION ANALYSIS (Always calculates ALL 5 features)
// ---------------------------------------------------------------------------
function calculateFeatureContributions(ocrData, classificationType) {
  const meta = ocrData?.metadata || {}
  const ocrText = (ocrData?.ocrText || '').toLowerCase()
  const title = meta.title || ''
  const org = meta.organization || ''
  const tags = meta.tags || []
  const dates = meta.importantDates || []
  const targetPatterns = PATTERN_DICT[classificationType] || []

  // Feature 1: Title (30%)
  let titleScore = 0
  let titleExplanation = ''
  if (title) {
    const matched = targetPatterns.filter((p) => title.toLowerCase().includes(p.toLowerCase()))
    if (matched.length > 0) {
      titleScore = Math.min(100, 50 + matched.length * 25)
      titleExplanation = `Matched title pattern(s): "${matched.slice(0, 2).join('", "')}"`
    } else {
      titleScore = 30
      titleExplanation = 'Title identified, but contains no direct category-specific pattern'
    }
  } else {
    titleScore = 0
    titleExplanation = 'No document title extracted'
  }
  const titleContrib = Number((titleScore * FEATURE_WEIGHTS.title).toFixed(1))

  // Feature 2: Keywords (25%)
  let keywordScore = 0
  let keywordExplanation = ''
  const matchedTextKeywords = targetPatterns.filter((p) => ocrText.includes(p.toLowerCase()))
  if (matchedTextKeywords.length > 0) {
    keywordScore = Math.min(100, 35 + matchedTextKeywords.length * 20)
    keywordExplanation = `Matched ${matchedTextKeywords.length} category keyword(s): "${matchedTextKeywords.slice(0, 3).join('", "')}"`
  } else if (tags.length > 0) {
    keywordScore = Math.min(60, tags.length * 15)
    keywordExplanation = `${tags.length} general keyword(s) extracted, but no strong category-specific match`
  } else {
    keywordScore = 0
    keywordExplanation = 'No strong category-specific keyword match'
  }
  const keywordContrib = Number((keywordScore * FEATURE_WEIGHTS.keywords).toFixed(1))

  // Feature 3: Organization (20%)
  let orgScore = 0
  let orgExplanation = ''
  if (org) {
    orgScore = 85
    orgExplanation = `Identified issuing authority: "${org.length > 40 ? org.slice(0, 37) + '...' : org}"`
  } else {
    orgScore = 0
    orgExplanation = 'No specific issuing organization detected'
  }
  const orgContrib = Number((orgScore * FEATURE_WEIGHTS.organization).toFixed(1))

  // Feature 4: OCR Quality (15%)
  const ocrConf = ocrData?.ocrConfidence ?? 0
  const ocrScore = Math.min(100, Math.max(0, ocrConf))
  let ocrExplanation = ''
  if (ocrScore >= 85) {
    ocrExplanation = `High OCR character recognition quality (${ocrScore}%)`
  } else if (ocrScore >= 65) {
    ocrExplanation = `Moderate OCR quality (${ocrScore}%) — text extracted with slight noise`
  } else {
    ocrExplanation = `Low OCR quality (${ocrScore}%) — character extraction contains significant noise`
  }
  const ocrContrib = Number((ocrScore * FEATURE_WEIGHTS.ocrQuality).toFixed(1))

  // Feature 5: Date Signals (10%)
  let dateScore = 0
  let dateExplanation = ''
  if (dates.length > 0) {
    const now = new Date()
    const nearFuture = dates.filter((d) => {
      const dt = new Date(d)
      const diffDays = (dt - now) / (1000 * 60 * 60 * 24)
      return diffDays >= -1 && diffDays <= 30
    })
    if (nearFuture.length > 0) {
      dateScore = 90
      dateExplanation = `Detected ${nearFuture.length} upcoming date/deadline signal(s) within 30 days`
    } else {
      dateScore = 40
      dateExplanation = `Found ${dates.length} date(s), but no imminent deadline signal detected`
    }
  } else {
    dateScore = 0
    dateExplanation = 'No imminent deadline or urgency signal detected'
  }
  const dateContrib = Number((dateScore * FEATURE_WEIGHTS.dateSignals).toFixed(1))

  // Return ALL 5 features consistently in exact defined order
  const allFeatures = [
    {
      feature: 'Title',
      featureKey: 'title',
      score: titleScore,
      weight: FEATURE_WEIGHTS.title,
      weightPercent: '30%',
      contribution: titleContrib,
      explanation: titleExplanation,
      evidenceFound: titleScore > 0,
    },
    {
      feature: 'Keywords',
      featureKey: 'keywords',
      score: keywordScore,
      weight: FEATURE_WEIGHTS.keywords,
      weightPercent: '25%',
      contribution: keywordContrib,
      explanation: keywordExplanation,
      evidenceFound: keywordScore > 0,
    },
    {
      feature: 'Organization',
      featureKey: 'organization',
      score: orgScore,
      weight: FEATURE_WEIGHTS.organization,
      weightPercent: '20%',
      contribution: orgContrib,
      explanation: orgExplanation,
      evidenceFound: orgScore > 0,
    },
    {
      feature: 'OCR Quality',
      featureKey: 'ocrQuality',
      score: ocrScore,
      weight: FEATURE_WEIGHTS.ocrQuality,
      weightPercent: '15%',
      contribution: ocrContrib,
      explanation: ocrExplanation,
      evidenceFound: ocrScore > 0,
    },
    {
      feature: 'Date Signals',
      featureKey: 'dateSignals',
      score: dateScore,
      weight: FEATURE_WEIGHTS.dateSignals,
      weightPercent: '10%',
      contribution: dateContrib,
      explanation: dateExplanation,
      evidenceFound: dateScore > 0,
    },
  ]

  // Calculate total feature evidence score (sum of all contributions)
  const featureEvidenceScore = Math.min(100, Math.max(0, Math.round(
    allFeatures.reduce((sum, f) => sum + f.contribution, 0)
  )))

  return { allFeatures, featureEvidenceScore }
}

// ---------------------------------------------------------------------------
// 2. DECISION TRACE GENERATION (Observable processing events only)
// ---------------------------------------------------------------------------
function generateDecisionTrace(ocrData, routeResult, classificationResult, consensus) {
  const steps = []
  const meta = ocrData?.metadata || {}

  // Step 1: OCR Extraction Event
  steps.push(
    `OCR extracted text with ${ocrData?.ocrConfidence ?? 0}% character accuracy using ${ocrData?.language || 'English'} OCR engine.`
  )

  // Step 2: Metadata Extraction Event
  const extractedCount = [meta.title, meta.organization, meta.subject].filter(Boolean).length
  steps.push(
    extractedCount > 0
      ? `Extracted metadata fields: Title ("${meta.title || 'N/A'}"), Issuing Authority ("${meta.organization || 'N/A'}").`
      : 'Metadata parsing attempted; limited structural fields identified in document body.'
  )

  // Step 3: Rule-Based Classification Event
  const ruleType = classificationResult.ruleType
  steps.push(
    `Rule-based classifier evaluated pattern density and assigned document category "${ruleType}" (${classificationResult.ruleConfidence}% confidence).`
  )

  // Step 4: AI Classification Event (If available)
  if (consensus.method === 'dual_engine_consensus') {
    steps.push(
      `AI engine evaluated document context and assigned category "${consensus.aiResult}" (${classificationResult.aiConfidence}% confidence).`
    )
    steps.push(
      consensus.agreement
        ? `Compared classification mechanisms: Both mechanisms agree on "${ruleType}".`
        : `Compared classification mechanisms: Mechanisms DISAGREE (Rule: "${ruleType}" vs AI: "${consensus.aiResult}"). Delta: ${consensus.confidenceDelta}%.`
    )
  } else {
    steps.push('AI mechanism comparison unavailable; evaluated using rule-based classification mechanism only.')
  }

  // Step 5: Overall Confidence Calculation Event
  steps.push(
    `Calculated weighted feature evidence score (${classificationResult.featureEvidenceScore}/100) and overall decision confidence (${classificationResult.overallConfidence}%).`
  )

  // Step 6: Department Routing Event
  const deptLabel = DEPT_NAMES[routeResult?.department] || routeResult?.department || 'Collector\'s Office'
  steps.push(
    `Applied department routing rule: Routed document to "${deptLabel}". Reason: ${routeResult?.routingReason || 'Default administrative routing rule.'}`
  )

  // Step 7: Urgency / Priority Event
  steps.push(
    `Assigned priority level "${routeResult?.priority || 'medium'}" based on date signals and urgency keyword analysis.`
  )

  // Step 8: Recommendation Event
  if (classificationResult.status === 'LOW CONFIDENCE' || !consensus.agreement) {
    steps.push('Confidence threshold check: Low confidence or engine disagreement detected — Manual Review Required.')
  } else {
    steps.push('Confidence threshold check: Confidence exceeds verification threshold — Auto processing approved.')
  }

  return steps
}

// ---------------------------------------------------------------------------
// 3. DUAL-ENGINE CONSENSUS & CONFIDENCE DELTA ANALYSIS
// ---------------------------------------------------------------------------
function evaluateConsensus(ocrData) {
  const meta = ocrData?.metadata || {}
  const ruleType = ocrData?.ruleBasedType || ocrData?.documentType || 'Other'
  const ruleConf = ocrData?.ruleConfidence ?? ocrData?.ocrConfidence ?? 50

  const isAiActive = meta.aiEnhanced === true && meta.classificationConfidence != null

  if (!isAiActive) {
    return {
      method: 'single_engine_mode',
      ruleResult: ruleType,
      ruleConfidence: ruleConf,
      aiResult: null,
      aiConfidence: null,
      agreement: false,
      consensusStatus: 'Not Available',
      confidenceDelta: 0,
      note: 'AI comparison unavailable. Classification based on rule-based engine only.',
    }
  }

  const aiType = meta.documentType || ruleType
  const aiConf = meta.classificationConfidence || 80

  // Fuzzy agreement check (partial word match or domain match)
  const ruleWords = ruleType.toLowerCase().split(/[\s/()]+/).filter(Boolean)
  const aiWords = aiType.toLowerCase().split(/[\s/()]+/).filter(Boolean)
  const hasOverlap = ruleWords.some((rw) => aiWords.some((aw) => aw.includes(rw) || rw.includes(aw)))
  const agreement = hasOverlap || ruleType === aiType

  const confidenceDelta = Math.abs(aiConf - ruleConf)

  let consensusStatus = 'Engines Agree'
  let note = 'Both rule-based and AI mechanisms agree on document category.'

  if (!agreement) {
    consensusStatus = 'Engines Disagree'
    note = `Mechanisms disagree on category (Rule: "${ruleType}" vs AI: "${aiType}"). Manual review recommended.`
  } else if (confidenceDelta > DISAGREEMENT_DELTA_THRESHOLD) {
    consensusStatus = 'High Delta'
    note = `Mechanisms agree on category, but confidence values differ significantly by ${confidenceDelta}%.`
  }

  return {
    method: 'dual_engine_consensus',
    ruleResult: ruleType,
    ruleConfidence: ruleConf,
    aiResult: aiType,
    aiConfidence: aiConf,
    agreement,
    consensusStatus,
    confidenceDelta,
    note,
  }
}

// ---------------------------------------------------------------------------
// 4. OVERALL CONFIDENCE & ACTION RECOMMENDATION (Deterministic Formula)
// ---------------------------------------------------------------------------
function calculateOverallConfidence(evidenceScore, consensus, ruleConf) {
  let overall = 0
  const aiConf = consensus.aiConfidence

  if (consensus.method === 'dual_engine_consensus') {
    if (consensus.agreement) {
      // Both engines agree: Weighted combination of evidence + engine average + consistency bonus (+5)
      const avgEngineConf = (ruleConf + aiConf) / 2
      overall = Math.round(evidenceScore * 0.55 + avgEngineConf * 0.40 + 5)
    } else {
      // Engines disagree: Penalty applied (-15), capped by lower engine score
      const lowerConf = Math.min(ruleConf, aiConf)
      overall = Math.round(evidenceScore * 0.45 + lowerConf * 0.40 - 15)
    }
  } else {
    // Single engine mode: Bounded by evidence score and rule engine confidence
    overall = Math.round(evidenceScore * 0.60 + ruleConf * 0.40)
  }

  // Ensure strictly bounded between 0% and 100%
  overall = Math.min(99, Math.max(15, overall))

  // Determine Status & Recommended Action using configurable thresholds
  let status = 'MEDIUM CONFIDENCE'
  let recommendedAction = 'MANUAL VERIFICATION'

  if (
    overall < CONFIDENCE_THRESHOLDS.LOW_ACTION_TRIGGER ||
    (consensus.method === 'dual_engine_consensus' && !consensus.agreement) ||
    (consensus.method === 'single_engine_mode' && evidenceScore < 45)
  ) {
    status = 'LOW CONFIDENCE'
    recommendedAction = 'MANUAL REVIEW REQUIRED'
  } else if (overall >= CONFIDENCE_THRESHOLDS.HIGH && consensus.agreement !== false) {
    status = 'HIGH CONFIDENCE'
    recommendedAction = 'AUTO PROCESS'
  }

  return { overallConfidence: overall, status, recommendedAction }
}

// ---------------------------------------------------------------------------
// 5. SEPARATE DEPARTMENT ROUTING EXPLANATION
// ---------------------------------------------------------------------------
function explainDepartmentRouting(ocrData, routeResult, classificationType) {
  const meta = ocrData?.metadata || {}
  const org = meta.organization || ''
  const deptCode = routeResult?.department || 'collector'
  const deptName = DEPT_NAMES[deptCode] || deptCode

  let routingReason = ''
  let routingConfidence = 75

  if (org && org.length > 3) {
    routingReason = `Routed to ${deptName} because issuing organization was identified as "${org}".`
    routingConfidence = 90
  } else if (routeResult?.reason && Array.isArray(routeResult.reason) && routeResult.reason.length > 1) {
    routingReason = routeResult.reason[1]
    routingConfidence = 80
  } else if (['Aadhaar Card', 'Passport', 'PAN Card', 'Voter ID', 'Ration Card'].includes(classificationType)) {
    routingReason = `Routed to ${deptName} because document matched the configured identity-document administrative routing rule.`
    routingConfidence = 85
  } else if (['Land Record (7/12)', 'Property Card'].includes(classificationType)) {
    routingReason = `Routed to ${deptName} because document matched the land records revenue management routing rule.`
    routingConfidence = 90
  } else {
    routingReason = `Routed to ${deptName} based on administrative document category fallback rule.`
    routingConfidence = 60
  }

  return {
    destinationDepartment: deptName,
    departmentCode: deptCode,
    routingReason,
    routingConfidence,
    priority: routeResult?.priority || 'medium',
  }
}

// ---------------------------------------------------------------------------
// 6. MAIN EXPORT: Generate Full XAI Explanation Package
// ---------------------------------------------------------------------------
export function generateXAIExplanation(ocrData, routeResult) {
  if (!ocrData) return null

  // Determine classification type from AI or Rule engine
  const meta = ocrData?.metadata || {}
  const finalType = meta.documentType || ocrData?.documentType || 'Other'

  // Step A: Calculate All 5 Feature Contributions
  const { allFeatures, featureEvidenceScore } = calculateFeatureContributions(ocrData, finalType)

  // Step B: Evaluate Dual-Engine Consensus
  const consensus = evaluateConsensus(ocrData)

  // Step C: Calculate Overall Decision Confidence & Recommended Action
  const { overallConfidence, status, recommendedAction } = calculateOverallConfidence(
    featureEvidenceScore,
    consensus,
    consensus.ruleConfidence
  )

  // Step D: Separate Department Routing Analysis
  const routingExplanation = explainDepartmentRouting(ocrData, routeResult, finalType)

  // Step E: Build Decision Trace
  const classificationResult = {
    finalType,
    ruleType: consensus.ruleResult,
    ruleConfidence: consensus.ruleConfidence,
    aiConfidence: consensus.aiConfidence,
    featureEvidenceScore,
    overallConfidence,
    status,
    recommendedAction,
  }
  const decisionTrace = generateDecisionTrace(ocrData, routeResult, classificationResult, consensus)

  return {
    classificationType: finalType,
    overallConfidence,
    featureEvidenceScore,
    status,
    recommendedAction,
    featureSaliency: allFeatures,
    decisionTrace,
    consensus,
    routingExplanation,
    weightsConfig: FEATURE_WEIGHTS,
    thresholdsConfig: CONFIDENCE_THRESHOLDS,
    timestamp: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// 7. SEPARATE PRIVACY FEATURE: PII Detection & Masking Utility
//    (Delegates to dedicated piiService.js)
// ---------------------------------------------------------------------------
export { detectPII, maskPII } from './piiService.js'

