// ---------------------------------------------------------------------------
// fallback.test.js — Dual-engine fallback (Gemini-unavailable) path
//
// Tests that when Gemini AI is unavailable / throws an error, the XAI engine
// falls back cleanly to single-engine (rule-based only) mode and that:
//   (a) generateXAIExplanation() still returns a valid classification result
//   (b) The result is correctly flagged as single_engine_mode, not dual_engine_consensus
//   (c) Low-confidence single-engine results still trigger MANUAL REVIEW REQUIRED
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateXAIExplanation, CONFIDENCE_THRESHOLDS } from '../src/services/xaiEngine.js'

// ---------------------------------------------------------------------------
// Mock aiService so no real network call is made.
// classifyWithAI returning null / throwing simulates Gemini being down.
// ---------------------------------------------------------------------------
vi.mock('../src/services/aiService.js', () => ({
  classifyWithAI: vi.fn().mockRejectedValue(new Error('Gemini unavailable: rate limit exceeded')),
  isAIAvailable: vi.fn().mockReturnValue(false),
  isConfidentialMode: vi.fn().mockReturnValue(false),
  enhanceMetadataWithAI: vi.fn().mockResolvedValue({ aiEnhanced: false }),
  generateAISummary: vi.fn().mockResolvedValue(null),
  chatWithAI: vi.fn().mockResolvedValue(null),
  aiSearchDocuments: vi.fn().mockResolvedValue(null),
  maskPII: vi.fn((text) => text),
}))

// ---------------------------------------------------------------------------
// Shared fixture: OCR data WITHOUT aiEnhanced flag → single-engine path
// ---------------------------------------------------------------------------
function makeSingleEngineOcrData(overrides = {}) {
  return {
    ocrText: 'महाराष्ट्र शासन महसूल विभाग ७/१२ सातबारा अधिकार अभिलेख गट क्रमांक ४५',
    ocrConfidence: 78,
    documentType: 'Land Record (7/12)',
    category: 'Land',
    pageCount: 1,
    // NOTE: metadata.aiEnhanced is NOT true → evaluateConsensus picks single_engine_mode
    metadata: {
      title: '7/12 Land Record Extract',
      organization: 'महाराष्ट्र शासन महसूल विभाग',
      classificationConfidence: null,  // absent → single engine
      importantDates: [],
      urgencyLevel: 'medium',
    },
    ...overrides,
  }
}

describe('Single-Engine Fallback (Gemini unavailable)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // (a) When Gemini is down, generateXAIExplanation still returns a valid result
  // -------------------------------------------------------------------------
  it('returns a valid XAI explanation object when AI is unavailable (no aiEnhanced flag)', () => {
    const ocrData = makeSingleEngineOcrData()
    const routeResult = { department: 'revenue', priority: 'medium', reason: ['Land Record routing rule'] }

    const explanation = generateXAIExplanation(ocrData, routeResult)

    // Must be defined and structured
    expect(explanation).toBeDefined()
    expect(explanation).not.toBeNull()
    expect(explanation.classificationType).toBe('Land Record (7/12)')
    expect(explanation.featureSaliency).toHaveLength(5)
    expect(explanation.decisionTrace).toBeDefined()
    expect(Array.isArray(explanation.decisionTrace)).toBe(true)
    expect(explanation.recommendedAction).toBeDefined()
    expect(explanation.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(explanation.overallConfidence).toBeLessThanOrEqual(100)
  })

  // -------------------------------------------------------------------------
  // (b) Result is flagged as single_engine_mode, NOT dual_engine_consensus
  // -------------------------------------------------------------------------
  it('sets consensus.method to single_engine_mode when Gemini result is absent', () => {
    const ocrData = makeSingleEngineOcrData()
    const explanation = generateXAIExplanation(ocrData, { department: 'revenue' })

    const { consensus } = explanation

    expect(consensus).toBeDefined()
    expect(consensus.method).toBe('single_engine_mode')
    expect(consensus.aiResult).toBeNull()
    expect(consensus.aiConfidence).toBeNull()
    // ruleResult is the local classifier's output
    expect(consensus.ruleResult).toBe('Land Record (7/12)')
    expect(typeof consensus.ruleConfidence).toBe('number')
  })

  // -------------------------------------------------------------------------
  // Single-engine decision trace includes the "rule-based only" notice
  // -------------------------------------------------------------------------
  it('decision trace includes the single-engine-only notice when AI is unavailable', () => {
    const ocrData = makeSingleEngineOcrData()
    const explanation = generateXAIExplanation(ocrData, { department: 'revenue' })

    const traceText = explanation.decisionTrace.join(' ')
    // The engine should note AI comparison was unavailable
    expect(traceText).toMatch(/AI mechanism comparison unavailable|rule-based classification mechanism only/i)
  })

  // -------------------------------------------------------------------------
  // (c) Low-confidence single-engine result triggers MANUAL REVIEW REQUIRED
  // Low confidence scenario: low OCR quality + no organization + no keywords
  // → evidenceScore < 45, so the LOW CONFIDENCE branch fires
  // -------------------------------------------------------------------------
  it('triggers MANUAL REVIEW REQUIRED for a low-evidence single-engine result', () => {
    const lowConfidenceOcr = {
      ocrText: 'some unrecognizable scanned text with no keywords',
      ocrConfidence: 20,          // very low OCR quality
      documentType: 'Other',
      category: 'General',
      pageCount: 1,
      metadata: {
        title: '',                 // no title
        organization: '',          // no org
        classificationConfidence: null,
        importantDates: [],
        urgencyLevel: 'low',
      },
    }

    const explanation = generateXAIExplanation(lowConfidenceOcr, { department: 'collector' })

    // Overall confidence must be below threshold
    expect(explanation.overallConfidence).toBeLessThan(CONFIDENCE_THRESHOLDS.LOW_ACTION_TRIGGER)

    // Status and action must reflect low confidence
    expect(explanation.status).toBe('LOW CONFIDENCE')
    expect(explanation.recommendedAction).toBe('MANUAL REVIEW REQUIRED')
  })

  // -------------------------------------------------------------------------
  // (d) Adequate single-engine evidence should NOT trigger Manual Review
  // Good OCR + title match + org present → evidenceScore ≥ 45 and overall ≥ 60
  // -------------------------------------------------------------------------
  it('does NOT trigger manual review for a high-evidence single-engine result', () => {
    const highConfidenceOcr = makeSingleEngineOcrData({
      ocrConfidence: 88,
    })

    const explanation = generateXAIExplanation(highConfidenceOcr, { department: 'revenue' })

    // Single-engine formula: overall = round(evidenceScore * 0.60 + ruleConf * 0.40)
    // With evidenceScore ~57 and ruleConf 78: ~57*0.6 + 78*0.4 = 34.2 + 31.2 = 65.4 → ≈ 65
    expect(explanation.overallConfidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.MEDIUM)
    expect(explanation.recommendedAction).not.toBe('MANUAL REVIEW REQUIRED')
  })

  // -------------------------------------------------------------------------
  // (e) Single-engine overallConfidence formula is correct
  // Formula: overall = round(evidenceScore * 0.60 + ruleConf * 0.40), bounded [15, 99]
  // -------------------------------------------------------------------------
  it('applies the correct single-engine confidence formula', () => {
    const ocrData = makeSingleEngineOcrData({ ocrConfidence: 78 })
    const explanation = generateXAIExplanation(ocrData, { department: 'revenue' })

    const { consensus, featureEvidenceScore, overallConfidence } = explanation

    expect(consensus.method).toBe('single_engine_mode')

    // Manually compute expected value using the formula from xaiEngine.js
    const ruleConf = consensus.ruleConfidence
    const expectedOverall = Math.min(99, Math.max(15,
      Math.round(featureEvidenceScore * 0.60 + ruleConf * 0.40)
    ))
    expect(overallConfidence).toBe(expectedOverall)
  })
})
