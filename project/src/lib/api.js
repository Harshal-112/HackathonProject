import { supabase } from './supabase.js'
import { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES, ROLES } from './mock-data.js'
import { uid, paginate, sortBy } from './utils.js'
import { smartSearch, parseQuery } from '../services/smartSearch.js'
import { autoRouteDocument, isOverdue } from '../services/workflowAutomation.js'
import { chatWithAI, aiSearchDocuments, isAIAvailable } from '../services/aiService.js'

// ---------------------------------------------------------------------------
// Canonical API module for SDDS (renamed from mock-api.js).
// Talks to Supabase (real Postgres + auth). Role-based access is enforced by
// Row Level Security policies in the database (see supabase/migrations/).
//
// New in this version:
//  - Document assignment: assigned_verifier_id, assigned_at fields
//  - Auto-assignment: lowest-load active verifier in the document's department
//  - flagForReverification: admin flags a doc for re-review by a different verifier
//  - suspendVerifier: admin deactivates a verifier; Realtime enforces session kill
//  - getVerifierStats: aggregated activity metrics per verifier from audit_logs
//  - No Math.random() fallbacks — unknown values are stored as null
// ---------------------------------------------------------------------------

function toDoc(row) {
  if (!row) return row
  return {
    id: row.id,
    title: row.title,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    fileUrl: row.file_url || null,
    category: row.category,            // null if not determined
    department: row.department,
    priority: row.priority,            // null if not determined
    status: row.status,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentNumber: row.document_number,
    pageCount: row.page_count,
    language: row.language,
    ocrText: row.ocr_text,
    ocrConfidence: row.ocr_confidence, // null if OCR was not run / unknown
    metadata: row.metadata || {},
    versions: row.versions || [],
    approvals: row.approvals || [],
    // Assignment fields
    assignedVerifierId: row.assigned_verifier_id || null,
    assignedVerifierName: row.assigned_verifier_name || null,
    assignedAt: row.assigned_at || null,
  }
}

function toUser(row) {
  if (!row) return row
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    designation: row.designation,
    phone: row.phone,
    status: row.status,
    avatar: row.avatar,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  }
}

function toLog(row) {
  if (!row) return row
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: row.user_role,
    action: row.action,
    description: row.description,
    documentId: row.document_id,
    documentTitle: row.document_title,
    timestamp: row.timestamp,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
  }
}

function toNotif(row) {
  if (!row) return row
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  }
}

function ok(error) {
  if (error) throw new Error(error.message)
}

async function logAction(user, action, description, doc = null) {
  const docId = doc?.id || null
  const { error } = await supabase.from('audit_logs').insert({
    user_id: user?.id || null,
    user_name: user?.name || 'System',
    user_role: user?.role || 'system',
    action,
    description,
    document_id: docId,
    document_title: doc?.title || null,
    ip_address: null,
    user_agent: navigator.userAgent,
  })
  if (error) {
    if (docId) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: user?.id || null,
          user_name: user?.name || 'System',
          user_role: user?.role || 'system',
          action,
          description,
          document_id: null,
          document_title: doc?.title || null,
          user_agent: navigator.userAgent,
        })
      } catch (_) {}
    } else {
      console.warn('audit log failed:', error.message)
    }
  }
}

async function addNotification(userId, type, title, message) {
  const { error } = await supabase.from('notifications').insert({ user_id: userId, type, title, message })
  if (error) console.warn('notification failed:', error.message)
}

// -------------------------------------------------------------------------
// Auto-assignment: find the active verifier in 'department' with the fewest
// currently pending+re_verification assigned documents.
// Returns the verifier profile row, or null if no eligible verifier exists.
// -------------------------------------------------------------------------
async function findLeastLoadedVerifier(department) {
  const { data: verifiers, error } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'verifier')
    .eq('status', 'active')
    .eq('department', department)

  if (error || !verifiers?.length) return null

  // Count pending documents per verifier
  const { data: assignedDocs } = await supabase
    .from('documents')
    .select('assigned_verifier_id')
    .in('status', ['pending', 're_verification'])
    .not('assigned_verifier_id', 'is', null)

  const loadMap = {}
  verifiers.forEach((v) => { loadMap[v.id] = 0 })
  ;(assignedDocs || []).forEach((d) => {
    if (loadMap[d.assigned_verifier_id] !== undefined) {
      loadMap[d.assigned_verifier_id]++
    }
  })

  // Pick verifier with lowest load
  let best = verifiers[0]
  let bestLoad = loadMap[best.id]
  for (const v of verifiers) {
    if (loadMap[v.id] < bestLoad) {
      best = v
      bestLoad = loadMap[v.id]
    }
  }
  return best
}

export const api = {
  // --- Password reset -------------------------------------------------
  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    ok(error)
    return { message: 'Password reset link sent to your email', otp: null }
  },

  async resetPassword() {
    throw new Error('Use the link emailed to you to reset your password.')
  },

  // --- Dashboard --------------------------------------------------------
  async getDashboardStats() {
    const { data: docs, error } = await supabase.from('documents').select('*')
    ok(error)
    const documents = (docs || []).map(toDoc)
    const { data: userRows } = await supabase.from('profiles').select('id')
    const { count: deptCount } = { count: DEPARTMENTS.length }
    const { data: logRows } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200)
    const auditLogs = (logRows || []).map(toLog)

    const today = new Date().setHours(0, 0, 0, 0)
    const stats = {
      totalDocuments: documents.length,
      pendingApprovals: documents.filter((d) => d.status === 'pending').length,
      todaysUploads: documents.filter((d) => new Date(d.createdAt).setHours(0, 0, 0, 0) === today).length,
      approvedDocuments: documents.filter((d) => d.status === 'approved').length,
      rejectedDocuments: documents.filter((d) => d.status === 'rejected').length,
      totalUsers: userRows?.length || 0,
      totalDepartments: deptCount,
      ocrProcessed: documents.filter((d) => d.ocrText).length,
    }
    const byDepartment = DEPARTMENTS.map((d) => ({
      name: d.code,
      fullName: d.name,
      count: documents.filter((doc) => doc.department === d.id).length,
    }))
    const byCategory = CATEGORIES.map((c) => ({
      name: c.name,
      count: documents.filter((doc) => doc.category === c.id).length,
    }))
    const byStatus = DOC_STATUSES.map((s) => ({
      name: s.name,
      count: documents.filter((doc) => doc.status === s.id).length,
    }))
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayStart = date.setHours(0, 0, 0, 0)
      const dayEnd = dayStart + 86400000
      return {
        date: new Date(dayStart).toLocaleDateString('en-IN', { weekday: 'short' }),
        uploads: documents.filter((d) => {
          const t = new Date(d.createdAt).getTime()
          return t >= dayStart && t < dayEnd
        }).length,
        approvals: auditLogs.filter((l) => l.action === 'APPROVE' && new Date(l.timestamp).getTime() >= dayStart && new Date(l.timestamp).getTime() < dayEnd).length,
      }
    })
    const recentDocuments = [...documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    const recentActivity = auditLogs.slice(0, 8)
    return { stats, byDepartment, byCategory, byStatus, last7Days, recentDocuments, recentActivity }
  },

  // --- Documents ----------------------------------------------------------
  async getDocuments(params = {}) {
    let query = supabase.from('documents').select('*', { count: 'exact' })
    if (params.department) query = query.eq('department', params.department)
    if (params.category) query = query.eq('category', params.category)
    if (params.status) query = query.eq('status', params.status)
    if (params.priority) query = query.eq('priority', params.priority)
    const { data, error } = await query
    ok(error)
    let docs = (data || []).map(toDoc)
    if (params.search) {
      const q = params.search.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber?.toLowerCase().includes(q) ||
          (d.ocrText || '').toLowerCase().includes(q) ||
          (d.metadata?.summary || '').toLowerCase().includes(q) ||
          (d.metadata?.tags || []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    docs = params.sortBy ? sortBy(docs, params.sortBy, params.sortDir || 'asc') : sortBy(docs, 'createdAt', 'desc')
    const total = docs.length
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const items = paginate(docs, page, pageSize)
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getDocument(id) {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single()
    ok(error)
    return toDoc(data)
  },

  async updateDocument(id, data, user) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)
    const versions = [
      ...(doc.versions || []),
      { version: (doc.versions?.length || 0) + 1, uploadedAt: new Date().toISOString(), uploadedBy: user.name, fileSize: doc.fileSize, note: 'Metadata updated' },
    ]
    const { data: updated, error } = await supabase
      .from('documents')
      .update({ ...data, versions, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    ok(error)
    await logAction(user, 'METADATA_CHANGE', 'Updated document metadata', doc)
    return toDoc(updated)
  },

  async deleteDocument(id, user) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)

    // Clean up stored file from Supabase Storage if present
    if (doc?.fileUrl) {
      try {
        await supabase.storage.from('documents').remove([doc.fileUrl])
      } catch (_) {
        // Fail-soft if storage file is already missing
      }
    }

    const { error } = await supabase.from('documents').delete().eq('id', id)
    ok(error)
    await logAction(user, 'DELETE', 'Deleted document', doc)
    return { success: true }
  },

  async uploadDocument(file, metadata, user, ocrData = null) {
    // Workflow automation: when OCR ran, use the classifier output + OCR text
    // to auto-pick category/department/priority. Manual selections in `metadata`
    // always win. Unknown values are stored as null — no random fallbacks.
    const auto = ocrData
      ? autoRouteDocument({
          classification: { type: ocrData.documentType, category: ocrData.category, confidence: ocrData?.metadata?.classificationConfidence },
          ocrText: ocrData.ocrText,
          importantDates: ocrData?.metadata?.importantDates || [],
        })
      : null

    const dept = metadata.department || auto?.department || user.department
    const deptObj = DEPARTMENTS.find((d) => d.id === dept)

    // Resolve category: metadata > auto > null (never random)
    const catId = metadata.category || auto?.category || null

    // Resolve priority: metadata > auto > null (never random)
    const priorityId = metadata.priority || auto?.priority || null

    // Auto-assign to verifier with lowest current load in this department
    const assignedVerifier = dept ? await findLeastLoadedVerifier(dept) : null
    const assignedAt = assignedVerifier ? new Date().toISOString() : null

    // Optional: Upload original scanned file to Supabase Storage bucket (Private Bucket)
    // Fails soft if bucket doesn't exist or storage isn't configured
    let fileUrl = null
    try {
      if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
        const sanitizedDept = dept || 'general'
        const storagePath = `${sanitizedDept}/${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('documents')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false })
        if (!storageErr && storageData?.path) {
          // Store relative storage path for secure signed URL generation
          fileUrl = storageData.path
        }
      }
    } catch (_) {
      // Storage not configured — continue without file storage
    }

    const row = {
      title: ocrData?.metadata?.title || metadata.title || file.name.replace(/\.[^.]+$/, ''),
      file_name: file.name,
      file_type: file.name.split('.').pop().toLowerCase(),
      file_size: file.size,
      category: catId,
      department: dept,
      priority: priorityId,
      status: 'pending',
      uploaded_by: user.id,
      // document_number is generated server-side via PostgreSQL sequence trigger (SDDS-DEP-YYYY-000001)
      document_number: null,
      page_count: ocrData?.pageCount || Math.ceil(file.size / 50000) || 1,
      language: ocrData?.language || 'English',
      ocr_text: ocrData?.ocrText || null,
      // null when OCR was not run or confidence is unknown — never random
      ocr_confidence: ocrData?.ocrConfidence ?? null,
      metadata: {
        ...ocrData?.metadata,
        title: ocrData?.metadata?.title || '',
        organization: ocrData?.metadata?.organization || '',
        subject: ocrData?.metadata?.subject || '',
        post: ocrData?.metadata?.post || '',
        documentNumber: ocrData?.metadata?.documentNumber || '',
        summary: ocrData?.metadata?.summary || '',
        tags: ocrData?.metadata?.tags || [],
        keywords: ocrData?.metadata?.tags || [],
        personNames: ocrData?.metadata?.personNames || [],
        addresses: ocrData?.metadata?.addresses || [],
        importantDates: ocrData?.metadata?.importantDates || [],
        location: ocrData?.metadata?.location || '',
        suggestedFolder: '',
        confidenceScore: ocrData?.ocrConfidence ?? null,
        routingReason: auto?.reason || [],
      },
      versions: [{ version: 1, uploadedAt: new Date().toISOString(), uploadedBy: user.name, fileSize: file.size, note: 'Initial upload' }],
      approvals: [],
      // Assignment
      assigned_verifier_id: assignedVerifier?.id || null,
      assigned_verifier_name: assignedVerifier?.name || null,
      assigned_at: assignedAt,
    }

    // Only include file_url if the column exists (migration 005 applied) and upload succeeded
    if (fileUrl) row.file_url = fileUrl

    const { data, error } = await supabase.from('documents').insert(row).select().single()
    ok(error)
    const doc = toDoc(data)
    await logAction(user, 'UPLOAD', 'Uploaded document', doc)
    if (assignedVerifier) {
      await addNotification(assignedVerifier.id, 'assignment', 'Document Assigned', `Document "${doc.title}" has been assigned to you for verification`)
      await logAction(user, 'ASSIGN', `Auto-assigned to verifier ${assignedVerifier.name}`, doc)
      await addNotification(user.id, 'upload', 'Upload Successful', `Document "${doc.title}" uploaded and assigned to ${assignedVerifier.name} for verification`)
    } else {
      // No active verifier in this department — document is unassigned.
      // An admin must manually assign it from the document details page.
      await logAction(user, 'UPLOAD_UNASSIGNED', `Uploaded unassigned — no active verifier available for department: ${dept || 'unknown'}`, doc)
      await addNotification(user.id, 'upload', 'Upload Successful (Unassigned)', `Document "${doc.title}" uploaded. No active verifier is currently available for this department — an administrator will assign one.`)
    }
    return doc
  },

  // --- Document Assignment (manual, admin use) ----------------------------
  async assignDocument(docId, verifierId, user) {
    const { data: verifier } = await supabase.from('profiles').select('id, name, department, status').eq('id', verifierId).single()
    if (!verifier) throw new Error('Verifier not found')
    if (verifier.status !== 'active') throw new Error('Cannot assign to an inactive or suspended verifier')

    const { data: existing } = await supabase.from('documents').select('*').eq('id', docId).single()
    const doc = toDoc(existing)

    const { data: updated, error } = await supabase
      .from('documents')
      .update({
        assigned_verifier_id: verifierId,
        assigned_verifier_name: verifier.name,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select()
      .single()
    ok(error)
    await logAction(user, 'ASSIGN', `Manually assigned to verifier ${verifier.name}`, doc)
    await addNotification(verifierId, 'assignment', 'Document Assigned', `Document "${doc.title}" has been assigned to you for verification`)
    return toDoc(updated)
  },

  // --- Public Document Verification (Data-Minimization Enforced) -----------
  async getPublicDocumentVerification(id) {
    // Queries the secure public view or RPC, preventing raw OCR / PII exposure
    let result = null
    const { data: viewData, error: viewError } = await supabase
      .from('public_document_verifications')
      .select('id, title, status, document_number, department, category, created_at, updated_at, is_authentic')
      .eq('id', id)
      .maybeSingle()

    if (!viewError && viewData) {
      result = viewData
    } else {
      // Fallback query to documents table if migration view not yet executed
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, status, document_number, department, category, created_at, updated_at')
        .eq('id', id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) throw new Error('Document not found.')
      result = { ...data, is_authentic: data.status === 'approved' }
    }
    
    // Return sanitized public verification record with no internal personal/verifier data
    return {
      id: result.id,
      title: result.title,
      status: result.status,
      documentNumber: result.document_number,
      department: result.department,
      category: result.category,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      isAuthentic: Boolean(result.is_authentic),
    }
  },

  // --- Approvals ----------------------------------------------------------
  // For verifiers: only documents assigned to them in their department.
  // For admins: all pending documents (read-only monitoring).
  async getApprovals(callerUser = null) {
    let query = supabase.from('documents').select('*').in('status', ['pending', 're_verification'])

    if (callerUser?.role === 'verifier') {
      // Strict: only docs assigned to this verifier AND in their department
      query = query
        .eq('assigned_verifier_id', callerUser.id)
        .eq('department', callerUser.department)
    }
    // Admins and officers get all pending/re_verification docs (no filter)

    const { data, error } = await query
    ok(error)
    return (data || []).map(toDoc)
  },

  async approveDocument(id, comment, user) {
    // UX pre-check: give a clear message before the network call
    if (user.role === 'admin') throw new Error('Administrators cannot approve documents. Approval authority belongs to the assigned verifier.')
    if (user.role !== 'verifier') throw new Error('Only verifiers may approve documents.')
    if (user.status !== 'active') throw new Error('Your account is not active. Contact an administrator.')

    // Fetch doc to get uploadedBy (needed for notification after RPC succeeds)
    const { data: existing } = await supabase.from('documents').select('uploaded_by, title').eq('id', id).single()

    // Delegate actual verification + update to the server-side RPC.
    // The DB function re-checks all conditions atomically with a row lock,
    // so no frontend manipulation can bypass the authorization.
    const { error: rpcError } = await supabase.rpc('process_document_decision', {
      p_document_id: id,
      p_decision: 'APPROVE',
      p_remarks: comment || 'Approved',
    })
    if (rpcError) throw new Error(rpcError.message)

    // Fetch updated document to return to the caller
    const { data: updated } = await supabase.from('documents').select('*').eq('id', id).single()
    if (existing?.uploaded_by) {
      await addNotification(existing.uploaded_by, 'approval', 'Document Approved', `Document "${existing.title}" has been approved`)
    }
    return toDoc(updated)
  },

  async rejectDocument(id, comment, user) {
    // UX pre-check
    if (user.role === 'admin') throw new Error('Administrators cannot reject documents. Rejection authority belongs to the assigned verifier.')
    if (user.role !== 'verifier') throw new Error('Only verifiers may reject documents.')
    if (user.status !== 'active') throw new Error('Your account is not active. Contact an administrator.')

    const { data: existing } = await supabase.from('documents').select('uploaded_by, title').eq('id', id).single()

    const { error: rpcError } = await supabase.rpc('process_document_decision', {
      p_document_id: id,
      p_decision: 'REJECT',
      p_remarks: comment || 'Rejected',
    })
    if (rpcError) throw new Error(rpcError.message)

    const { data: updated } = await supabase.from('documents').select('*').eq('id', id).single()
    if (existing?.uploaded_by) {
      await addNotification(existing.uploaded_by, 'rejected', 'Document Rejected', `Document "${existing.title}" has been rejected`)
    }
    return toDoc(updated)
  },

  async requestChanges(id, comment, user) {
    // UX pre-check
    if (user.role === 'admin') throw new Error('Administrators cannot request changes. This authority belongs to the assigned verifier.')
    if (user.role !== 'verifier') throw new Error('Only verifiers may request changes on documents.')
    if (user.status !== 'active') throw new Error('Your account is not active. Contact an administrator.')

    const { data: existing } = await supabase.from('documents').select('uploaded_by, title').eq('id', id).single()

    const { error: rpcError } = await supabase.rpc('process_document_decision', {
      p_document_id: id,
      p_decision: 'REQUEST_CHANGES',
      p_remarks: comment || 'Changes requested',
    })
    if (rpcError) throw new Error(rpcError.message)

    const { data: updated } = await supabase.from('documents').select('*').eq('id', id).single()
    if (existing?.uploaded_by) {
      await addNotification(existing.uploaded_by, 'changes', 'Changes Requested', `Document "${existing.title}" requires changes before approval. Please review and resubmit.`)
    }
    return toDoc(updated)
  },

  // --- Flag for Re-verification (Admin only) -------------------------------
  // Sets status to 're_verification', reassigns to a different verifier.
  // The original approval/rejection history is preserved permanently.
  async flagForReverification(id, reason, newVerifierId, user) {
    if (user.role !== 'admin') throw new Error('Only administrators can flag documents for re-verification.')
    if (!reason?.trim()) throw new Error('A reason is required when flagging a document for re-verification.')

    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)

    // Resolve new verifier
    let newVerifierName = null
    if (newVerifierId) {
      const { data: vProfile } = await supabase.from('profiles').select('id, name, status').eq('id', newVerifierId).single()
      if (!vProfile) throw new Error('Selected verifier not found.')
      if (vProfile.status !== 'active') throw new Error('Cannot assign to an inactive or suspended verifier.')
      newVerifierName = vProfile.name
    }

    // Append flag entry to approval history (original entries are untouched)
    const approvals = [
      ...(doc.approvals || []),
      {
        id: uid('flag'),
        action: 'flagged_for_reverification',
        userId: user.id,
        userName: user.name,
        comment: reason,
        timestamp: new Date().toISOString(),
        reassignedTo: newVerifierName,
      },
    ]

    const { data: updated, error } = await supabase
      .from('documents')
      .update({
        status: 're_verification',
        approvals,
        assigned_verifier_id: newVerifierId || null,
        assigned_verifier_name: newVerifierName,
        assigned_at: newVerifierId ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    ok(error)

    await logAction(user, 'ADMIN_FLAG', `Flagged for re-verification: ${reason}`, doc)
    if (newVerifierId) {
      await addNotification(newVerifierId, 'assignment', 'Document Flagged for Re-verification', `Document "${doc.title}" has been flagged and reassigned to you for re-review`)
      await addNotification(doc.uploadedBy, 'reverification', 'Document Under Re-verification', `Document "${doc.title}" has been flagged for re-verification by an administrator`)
    }
    return toDoc(updated)
  },

  // --- Verifier Suspension (Admin only) -----------------------------------
  // Sets status=inactive. Supabase Realtime pushes the change to auth-context,
  // which immediately signs the verifier out. RLS also rejects any in-flight
  // approval/rejection calls from the suspended verifier's session.
  async suspendVerifier(verifierId, adminUser) {
    if (adminUser.role !== 'admin') throw new Error('Only administrators can suspend verifiers.')
    const { data: verifier } = await supabase.from('profiles').select('id, name, role').eq('id', verifierId).single()
    if (!verifier) throw new Error('Verifier not found.')
    if (verifier.role !== 'verifier') throw new Error('Can only suspend verifier accounts.')

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', verifierId)
      .select()
      .single()
    ok(error)
    await logAction(adminUser, 'SUSPEND', `Suspended verifier account: ${verifier.name}`, null)
    return toUser(updated)
  },

  // --- Verifier Statistics (Admin oversight panel) -----------------------
  // Aggregates activity from audit_logs grouped by verifier.
  async getVerifierStats() {
    const { data: verifiers } = await supabase
      .from('profiles')
      .select('id, name, department, status, created_at')
      .eq('role', 'verifier')

    if (!verifiers?.length) return []

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('user_id, user_name, action, timestamp, document_title')
      .in('action', ['APPROVE', 'REJECT', 'ADMIN_FLAG', 'ASSIGN'])

    const { data: pendingDocs } = await supabase
      .from('documents')
      .select('assigned_verifier_id, created_at, assigned_at')
      .in('status', ['pending', 're_verification'])
      .not('assigned_verifier_id', 'is', null)

    const { data: overdueDocs } = await supabase
      .from('documents')
      .select('assigned_verifier_id, created_at, priority')
      .in('status', ['pending', 're_verification'])
      .not('assigned_verifier_id', 'is', null)

    return verifiers.map((v) => {
      const vLogs = (logs || []).filter((l) => l.user_id === v.id)
      const approved = vLogs.filter((l) => l.action === 'APPROVE').length
      const rejected = vLogs.filter((l) => l.action === 'REJECT').length
      const total = approved + rejected
      const approvalRate = total > 0 ? Math.round((approved / total) * 100) : null

      // Pending assigned docs
      const pendingAssigned = (pendingDocs || []).filter((d) => d.assigned_verifier_id === v.id).length

      // Overdue: pending > 3 days (high), > 7 days (urgent). Use same logic as workflowAutomation.
      const now = Date.now()
      const overdueCount = (overdueDocs || []).filter((d) => {
        if (d.assigned_verifier_id !== v.id) return false
        const ms = now - new Date(d.assigned_at || d.created_at).getTime()
        const days = ms / 86400000
        const limit = d.priority === 'urgent' ? 1 : d.priority === 'high' ? 2 : 3
        return days > limit
      }).length

      // Re-verification flags (docs this verifier approved that were later flagged)
      const reFlagCount = (logs || []).filter((l) => l.action === 'ADMIN_FLAG' && l.user_name?.includes(v.name)).length

      // Average verification time (final decision - assigned_at)
      const { data: decidedDocs } = { data: null } // would require join; approximated from logs
      // We'll use log timestamps as proxy: time between ASSIGN and APPROVE/REJECT log for same doc
      // For simplicity, track from assigned_at field where available
      let avgTimeDays = null
      const approvalLogs = vLogs.filter((l) => l.action === 'APPROVE' || l.action === 'REJECT')
      if (approvalLogs.length > 0) {
        // Compute using log timestamps as approximation (proper calc needs join with assigned_at)
        // This is a best-effort metric shown in the oversight panel
        avgTimeDays = '—'
      }

      // Risk Indicator
      let riskLevel = 'LOW'
      if (approvalRate !== null && approvalRate > 95 && total > 20) riskLevel = 'HIGH'
      else if (approvalRate !== null && approvalRate > 90 && total > 10) riskLevel = 'MEDIUM'

      return {
        id: v.id,
        name: v.name,
        department: v.department,
        status: v.status,
        approved,
        rejected,
        total,
        approvalRate,
        pendingAssigned,
        overdueCount,
        reFlagCount,
        avgTimeDays,
        riskLevel,
      }
    })
  },

  // --- Audit logs (staff only — enforced by RLS) -----------------------
  async getAuditLogs(params = {}) {
    let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false })
    if (params.action) query = query.eq('action', params.action)
    if (params.userId) query = query.eq('user_id', params.userId)
    const { data, error } = await query
    ok(error)
    let logs = (data || []).map(toLog)
    if (params.search) {
      const q = params.search.toLowerCase()
      logs = logs.filter((l) => l.userName?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q))
    }
    const total = logs.length
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const items = paginate(logs, page, pageSize)
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  // --- Notifications (per-user) ----------------------------------------
  async getNotifications() {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    ok(error)
    return (data || []).map(toNotif)
  },

  async markNotificationRead(id) {
    const { data, error } = await supabase.from('notifications').update({ read: true }).eq('id', id).select().single()
    ok(error)
    return toNotif(data)
  },

  async markAllNotificationsRead() {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notifications').update({ read: true }).or(`user_id.eq.${user.id},user_id.is.null`)
    ok(error)
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    return (data || []).map(toNotif)
  },

  async deleteNotification(id) {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    ok(error)
    return { success: true }
  },

  async deleteAllNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id)
    ok(error)
    return { success: true }
  },

  // --- Users (admin-only writes — enforced by RLS) ----------------------
  async getUsers() {
    const { data, error } = await supabase.from('profiles').select('*')
    ok(error)
    return (data || []).map(toUser)
  },

  async createUser() {
    throw new Error('Direct user creation needs a server-side admin call (Supabase Edge Function). Ask the person to self-register at /register, then set their role here.')
  },

  async updateUser(id, data) {
    const { data: updated, error } = await supabase.from('profiles').update(data).eq('id', id).select().single()
    ok(error)
    return toUser(updated)
  },

  async deleteUser(id) {
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    ok(error)
    return { success: true }
  },

  // --- Reports ----------------------------------------------------------
  async getReports(params = {}) {
    const { data: docRows, error } = await supabase.from('documents').select('*')
    ok(error)
    const docs = (docRows || []).map(toDoc)
    const { data: userRows } = await supabase.from('profiles').select('*')
    const users = (userRows || []).map(toUser)

    const period = params.period || 'monthly'
    let filtered = docs
    const now = new Date()
    if (period === 'daily') {
      filtered = docs.filter((d) => new Date(d.createdAt).toDateString() === now.toDateString())
    } else if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      filtered = docs.filter((d) => new Date(d.createdAt) >= weekAgo)
    } else if (period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 86400000)
      filtered = docs.filter((d) => new Date(d.createdAt) >= monthAgo)
    }
    const byDepartment = DEPARTMENTS.map((d) => ({
      department: d.name,
      count: filtered.filter((doc) => doc.department === d.id).length,
      approved: filtered.filter((doc) => doc.department === d.id && doc.status === 'approved').length,
      pending: filtered.filter((doc) => doc.department === d.id && doc.status === 'pending').length,
    }))
    const byUser = users
      .map((u) => ({ user: u.name, role: u.role, count: filtered.filter((doc) => doc.uploadedBy === u.id).length }))
      .filter((x) => x.count > 0)
    const byType = CATEGORIES.map((c) => ({ type: c.name, count: filtered.filter((doc) => doc.category === c.id).length }))
    return { period, total: filtered.length, byDepartment, byUser, byType, generatedAt: new Date().toISOString() }
  },

  // --- Settings (admin write, everyone read) ---------------------------
  async getSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('data').eq('id', 1).single()
      if (!error && data?.data) {
        localStorage.setItem('sdds_settings', JSON.stringify(data.data))
        return data.data
      }
    } catch (_) {}
    const cached = localStorage.getItem('sdds_settings')
    if (cached) {
      try { return JSON.parse(cached) } catch (_) {}
    }
    const { DEMO_SETTINGS } = await import('./mock-data.js')
    return DEMO_SETTINGS
  },

  async updateSettings(patch) {
    let existing = {}
    try {
      const { data } = await supabase.from('settings').select('data').eq('id', 1).single()
      if (data?.data) existing = data.data
    } catch (_) {}
    if (!Object.keys(existing).length) {
      const cached = localStorage.getItem('sdds_settings')
      if (cached) { try { existing = JSON.parse(cached) } catch (_) {} }
    }
    const merged = { ...existing, ...patch }
    localStorage.setItem('sdds_settings', JSON.stringify(merged))
    try {
      const { data, error } = await supabase
        .from('settings')
        .upsert({ id: 1, data: merged })
        .select('data')
        .single()
      if (!error && data?.data) return data.data
    } catch (_) {}
    return merged
  },

  async searchDocuments(query) {
    const { data, error } = await supabase.from('documents').select('*')
    ok(error)
    const docs = (data || []).map(toDoc)
    if (isAIAvailable()) {
      try {
        const matchingIds = await aiSearchDocuments(query, docs)
        if (matchingIds?.length > 0) {
          const matchedMap = new Map(docs.map((d) => [d.id, d]))
          const aiResults = matchingIds.map((id) => matchedMap.get(id)).filter(Boolean)
          if (aiResults.length > 0) {
            const { data: { user } } = await supabase.auth.getUser()
            await logAction(user ? { id: user.id } : null, 'SEARCH', `AI Search for: ${query}`)
            return aiResults
          }
        }
      } catch (aiErr) {
        console.warn('AI search failed, falling back to smartSearch:', aiErr.message)
      }
    }
    const results = smartSearch(docs, query, { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES })
    const { data: { user } } = await supabase.auth.getUser()
    await logAction(user ? { id: user.id } : null, 'SEARCH', `Searched for: ${query}`)
    return results
  },

  async chatWithDocuments(message) {
    const { data } = await supabase.from('documents').select('*')
    const docs = (data || []).map(toDoc)
    const lookups = { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES }
    if (isAIAvailable()) {
      try {
        const summaries = docs.map((d) => ({
          title: d.title,
          documentNumber: d.documentNumber,
          status: d.status,
          priority: d.priority,
          department: DEPARTMENTS.find((dep) => dep.id === d.department)?.name || d.department,
          category: CATEGORIES.find((c) => c.id === d.category)?.name || d.category,
          createdAt: d.createdAt,
          uploadedBy: d.uploadedByName,
        }))
        const aiResponse = await chatWithAI(message, summaries)
        if (aiResponse) {
          const { data: { user } } = await supabase.auth.getUser()
          await logAction(user ? { id: user.id } : null, 'SEARCH', `AI Chat: ${message}`)
          return { response: aiResponse, aiPowered: true }
        }
      } catch (aiErr) {
        console.warn('AI chat failed, falling back:', aiErr.message)
      }
    }
    const q = message.toLowerCase()
    const { filters } = parseQuery(message, lookups)
    const hasFilters = Object.keys(filters).length > 0
    let response = ''
    if (q.includes('how many') || q.includes('total') || q.includes('count')) {
      const scoped = hasFilters ? smartSearch(docs, message, lookups) : docs
      response = `There are currently ${scoped.length} document(s)${hasFilters ? ' matching that filter' : ' in the system'}. ${scoped.filter((d) => d.status === 'pending').length} are pending approval, ${scoped.filter((d) => d.status === 'approved').length} have been approved, and ${scoped.filter((d) => d.status === 'rejected').length} have been rejected.`
    } else if (q.includes('overdue') || q.includes('escalat') || q.includes('late')) {
      const overdue = docs.filter((d) => isOverdue(d))
      response = overdue.length
        ? `There are ${overdue.length} overdue document(s) awaiting approval:\n\n${overdue.slice(0, 5).map((d) => `• ${d.title} (${d.priority} priority, waiting since ${new Date(d.createdAt).toLocaleDateString('en-IN')})`).join('\n')}`
        : `Nothing is overdue right now — every pending document is still within its review window.`
    } else if (q.includes('pending') || q.includes('approval')) {
      const pendingDocs = docs.filter((d) => d.status === 'pending')
      const pending = (hasFilters ? smartSearch(pendingDocs, message, lookups) : pendingDocs).slice(0, 5)
      response = `There are ${pendingDocs.length} documents pending approval${hasFilters ? ' matching that filter' : ''}. Here are the most relevant:\n\n${pending.map((d) => `• ${d.title} (uploaded by ${d.uploadedByName})`).join('\n')}`
    } else if (q.includes('land') || q.includes('property')) {
      const land = docs.filter((d) => d.title.toLowerCase().includes('land') || d.title.toLowerCase().includes('property') || d.category === 'land').slice(0, 5)
      response = `I found ${land.length} land/property related documents:\n\n${land.map((d) => `• ${d.title} - ${d.documentNumber}`).join('\n')}`
    } else if (q.includes('upload') || q.includes('recent')) {
      const recentPool = hasFilters ? smartSearch(docs, message, lookups) : docs
      const recent = [...recentPool].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
      response = `Here are the most recently uploaded documents${hasFilters ? ' matching that filter' : ''}:\n\n${recent.map((d) => `• ${d.title} (uploaded ${new Date(d.createdAt).toLocaleDateString('en-IN')})`).join('\n')}`
    } else if (q.includes('department')) {
      const deptCounts = DEPARTMENTS.map((d) => ({ name: d.name, count: docs.filter((doc) => doc.department === d.id).length })).sort((a, b) => b.count - a.count)
      response = `Documents by department:\n\n${deptCounts.map((d) => `• ${d.name}: ${d.count}`).join('\n')}`
    } else {
      const matching = smartSearch(docs, message, lookups).slice(0, 5)
      response = matching.length
        ? `I found ${matching.length} documents matching your query:\n\n${matching.map((d) => `• ${d.title} - ${d.documentNumber}`).join('\n')}`
        : `I couldn't find any documents matching "${message}". Try asking about document counts, pending approvals, overdue items, recent uploads, or documents by department/category/priority.`
    }
    return { response, aiPowered: false }
  },

  // --- Signed file URL (private storage) -----------------------------------
  // Generates a short-lived (1-hour) signed URL for a stored document file.
  // `storagePath` is the raw path stored in file_url (e.g. "dept/userId/timestamp_name.pdf").
  // Returns null when no path is supplied or when the storage bucket is not configured.
  async getSignedFileUrl(storagePath) {
    if (!storagePath) return null
    // If it is already a full external URL, return it directly
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath
    }
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 3600) // 1-hour expiry
      if (error || !data?.signedUrl) return null
      return data.signedUrl
    } catch (_) {
      return null
    }
  },

  async getConstants() {
    return { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES, ROLES }
  },
}

// Legacy alias — kept so existing code that uses `mockApi` continues to work
// while components are migrated to `api`. Remove once migration is complete.
export const mockApi = api
