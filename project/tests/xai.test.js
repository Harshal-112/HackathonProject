import { describe, it, expect } from 'vitest'
import {
  FEATURE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  generateXAIExplanation,
} from '../src/services/xaiEngine.js'

describe('Explainable AI (XAI) Engine & Decision Transparency', () => {
  it('strictly enforces that the 5 deterministic feature weights sum to exactly 1.00 (100%)', () => {
    const sum =
      FEATURE_WEIGHTS.title +
      FEATURE_WEIGHTS.keywords +
      FEATURE_WEIGHTS.organization +
      FEATURE_WEIGHTS.ocrQuality +
      FEATURE_WEIGHTS.dateSignals

    // Exactly 1.00
    expect(Number(sum.toFixed(6))).toBe(1.0)
    expect(FEATURE_WEIGHTS.title).toBe(0.30)
    expect(FEATURE_WEIGHTS.keywords).toBe(0.25)
    expect(FEATURE_WEIGHTS.organization).toBe(0.20)
    expect(FEATURE_WEIGHTS.ocrQuality).toBe(0.15)
    expect(FEATURE_WEIGHTS.dateSignals).toBe(0.10)
  })

  it('calculates deterministic feature contributions accurately: Contribution_i = FeatureScore_i * Weight_i', () => {
    const mockOcrData = {
      ocrText: 'महाराष्ट्र शासन महसूल विभाग ७/१२ सातबारा अधिकार अभिलेख गट क्रमांक ४५ दिनांक १२/०१/२०२६',
      ocrConfidence: 90,
      documentType: 'Land Record (7/12)',
      category: 'Land',
      pageCount: 1,
      metadata: {
        title: '7/12 Land Record Extract',
        organization: 'महाराष्ट्र शासन महसूल विभाग',
        classificationConfidence: 85,
        importantDates: ['2026-01-12'],
        urgencyLevel: 'medium',
      },
    }

    const explanation = generateXAIExplanation(mockOcrData, 'revenue')

    expect(explanation).toBeDefined()
    expect(explanation.featureSaliency).toBeDefined()
    expect(explanation.featureSaliency.length).toBe(5)

    // Verify mathematical formula for each feature
    let totalComputedScore = 0
    for (const feat of explanation.featureSaliency) {
      expect(feat.weight).toBeDefined()
      expect(feat.score).toBeGreaterThanOrEqual(0)
      expect(feat.score).toBeLessThanOrEqual(100)
      
      const expectedContrib = Number((feat.score * feat.weight).toFixed(1))
      expect(feat.contribution).toBe(expectedContrib)
      totalComputedScore += feat.contribution
    }

    expect(explanation.featureEvidenceScore).toBe(Math.round(totalComputedScore))
    expect(explanation.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(explanation.overallConfidence).toBeLessThanOrEqual(100)
  })

  it('generates a transparent decision trace with observable steps', () => {
    const mockOcrData = {
      ocrText: 'FIRST INFORMATION REPORT Police Station Shivajinagar FIR No 123/2026',
      ocrConfidence: 88,
      documentType: 'FIR',
      category: 'Legal',
      metadata: {
        title: 'FIR 123/2026',
        organization: 'Police Department',
        classificationConfidence: 80,
      },
    }

    const explanation = generateXAIExplanation(mockOcrData, 'collector')

    expect(explanation.decisionTrace).toBeDefined()
    expect(Array.isArray(explanation.decisionTrace)).toBe(true)
    expect(explanation.decisionTrace.length).toBeGreaterThanOrEqual(3)
    expect(explanation.recommendedAction).toBeDefined()
  })
})
