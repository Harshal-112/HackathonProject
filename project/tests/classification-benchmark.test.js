import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { classifyDocument } from '../src/services/documentClassifier.js'
import { autoRouteDocument } from '../src/services/workflowAutomation.js'

describe('Document Classification Benchmark & Evaluation', () => {
  const benchmarkPath = path.resolve(__dirname, './data/classification-benchmark.json')
  const rawData = fs.readFileSync(benchmarkPath, 'utf8')
  const benchmarkSamples = JSON.parse(rawData)

  it('evaluates Rule Engine classification accuracy against labeled benchmark dataset', () => {
    let correctTypeMatches = 0
    let correctDeptMatches = 0
    const totalSamples = benchmarkSamples.length

    const results = []

    for (const sample of benchmarkSamples) {
      const classification = classifyDocument(sample.text)
      const routing = autoRouteDocument({
        classification,
        ocrText: sample.text,
        importantDates: [],
      })

      const typeMatch =
        classification.type.toLowerCase() === sample.expectedType.toLowerCase() ||
        classification.category.toLowerCase() === sample.expectedCategory.toLowerCase()

      const deptMatch = routing.department.toLowerCase() === sample.expectedDepartment.toLowerCase()

      if (typeMatch) correctTypeMatches++
      if (deptMatch) correctDeptMatches++

      results.push({
        id: sample.id,
        description: sample.description,
        predictedType: classification.type,
        expectedType: sample.expectedType,
        predictedDept: routing.department,
        expectedDept: sample.expectedDepartment,
        confidence: classification.confidence,
        typeMatch,
        deptMatch,
      })
    }

    const typeAccuracy = (correctTypeMatches / totalSamples) * 100
    const deptAccuracy = (correctDeptMatches / totalSamples) * 100

    console.log('\n=== CLASSIFICATION BENCHMARK EVALUATION RESULTS ===')
    console.log(`Total Test Samples Evaluated: ${totalSamples}`)
    console.log(`Type / Category Match Accuracy: ${typeAccuracy.toFixed(1)}% (${correctTypeMatches}/${totalSamples})`)
    console.log(`Department Routing Accuracy: ${deptAccuracy.toFixed(1)}% (${correctDeptMatches}/${totalSamples})`)
    console.log('===================================================\n')

    // Expect at least 80% accuracy on rule-based classification benchmark
    expect(typeAccuracy).toBeGreaterThanOrEqual(80)
    expect(deptAccuracy).toBeGreaterThanOrEqual(80)
  })
})
