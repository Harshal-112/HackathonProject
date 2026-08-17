import { describe, it, expect } from 'vitest'
import { autoRouteDocument, isOverdue, sortApprovalsByUrgency } from '../src/services/workflowAutomation.js'
import { DOC_STATUSES } from '../src/lib/mock-data.js'

describe('Document Workflow Automation & Routing', () => {
  it('correctly maps Land Records to the Revenue Department', () => {
    const route = autoRouteDocument({
      classification: { type: 'Land Record (7/12)', category: 'Land', confidence: 88 },
      ocrText: 'महाराष्ट्र शासन महसूल विभाग ७/१२ सातबारा गट क्रमांक ४५',
      importantDates: [],
    })

    expect(route.department).toBe('revenue')
    expect(route.category).toBe('land')
    expect(route.reason.length).toBeGreaterThan(0)
  })

  it('correctly maps Health documents to the Health Department', () => {
    const route = autoRouteDocument({
      classification: { type: 'Government Order/Letter', category: 'Health', confidence: 90 },
      ocrText: 'सार्वजनिक आरोग्य विभाग शासन निर्णय रुग्णालय औषध खरेदी',
      importantDates: [],
    })

    expect(route.department).toBe('health')
    expect(route.category).toBe('notice')
  })

  it('flags urgent documents as overdue when older than SLA threshold', () => {
    const urgentDocOverdue = {
      id: 'doc_1',
      title: 'Urgent Circular',
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // 36 hours ago (SLA: 24h)
    }

    const urgentDocFresh = {
      id: 'doc_2',
      title: 'Fresh Circular',
      priority: 'urgent',
      status: 'pending',
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours ago
    }

    expect(isOverdue(urgentDocOverdue)).toBe(true)
    expect(isOverdue(urgentDocFresh)).toBe(false)
  })

  it('includes re_verification in standard document status catalog', () => {
    const reVerifStatus = DOC_STATUSES.find((s) => s.id === 're_verification')
    expect(reVerifStatus).toBeDefined()
    expect(reVerifStatus.name).toBe('Re-verification Required')
  })

  it('sorts approval queue prioritizing overdue and high urgency documents', () => {
    const docs = [
      { id: '1', priority: 'low', createdAt: new Date().toISOString() },
      { id: '2', priority: 'urgent', createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
      { id: '3', priority: 'medium', createdAt: new Date().toISOString() },
    ]

    const sorted = sortApprovalsByUrgency(docs)
    expect(sorted[0].id).toBe('2') // Overdue urgent should be top
  })
})
