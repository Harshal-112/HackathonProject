import { describe, it, expect } from 'vitest'
import { api } from '../src/lib/api.js'

describe('RBAC Authorization & Verifier Authority Constraints', () => {
  it('strictly rejects approval or rejection attempts by an Admin (Monitor Only)', async () => {
    const adminUser = { id: 'admin_1', name: 'Super Admin', role: 'admin', status: 'active', department: 'revenue' }

    await expect(api.approveDocument('doc_123', 'Approved', adminUser)).rejects.toThrow(
      /Administrators cannot approve documents/i
    )

    await expect(api.rejectDocument('doc_123', 'Rejected', adminUser)).rejects.toThrow(
      /Administrators cannot reject documents/i
    )

    await expect(api.requestChanges('doc_123', 'Need changes', adminUser)).rejects.toThrow(
      /Administrators cannot request changes/i
    )
  })

  it('rejects approval attempts by an inactive or suspended verifier', async () => {
    const suspendedVerifier = {
      id: 'verif_1',
      name: 'Suspended Verifier',
      role: 'verifier',
      status: 'inactive',
      department: 'revenue',
    }

    await expect(api.approveDocument('doc_123', 'Approved', suspendedVerifier)).rejects.toThrow(
      /account is not active/i
    )
  })

  it('rejects actions by users who do not have the verifier role', async () => {
    const citizenUser = { id: 'citizen_1', name: 'Citizen User', role: 'citizen', status: 'active', department: 'panchayat' }

    await expect(api.approveDocument('doc_123', 'Approved', citizenUser)).rejects.toThrow(
      /Only verifiers may approve documents/i
    )
  })

  it('allows only administrators to flag documents for re-verification', async () => {
    const verifierUser = { id: 'verif_2', name: 'Active Verifier', role: 'verifier', status: 'active', department: 'revenue' }

    await expect(
      api.flagForReverification('doc_123', 'Suspicious approval', 'verif_3', verifierUser)
    ).rejects.toThrow(/Only administrators can flag documents/i)
  })

  it('requires a mandatory reason when an administrator flags for re-verification', async () => {
    const adminUser = { id: 'admin_1', name: 'Super Admin', role: 'admin', status: 'active', department: 'revenue' }

    await expect(
      api.flagForReverification('doc_123', '   ', 'verif_3', adminUser)
    ).rejects.toThrow(/reason is required/i)
  })
})
