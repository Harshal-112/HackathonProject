import { supabase } from './supabase.js'
import { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES, ROLES } from './mock-data.js'
import { uid, paginate, sortBy } from './utils.js'
import { smartSearch, parseQuery } from '../services/smartSearch.js'
import { autoRouteDocument, isOverdue } from '../services/workflowAutomation.js'
import { chatWithAI, aiSearchDocuments, isAIAvailable } from '../services/aiService.js'

// ---------------------------------------------------------------------------
// This file used to be a fake API that read/wrote everything to
// localStorage — which is why accounts and data never showed up on a second
// device. It now talks to Supabase (a real hosted Postgres DB + auth), and
// role-based access is enforced by Row Level Security policies in the
// database itself (see supabase-schema.sql), not just by hiding buttons here.
//
// The exported shape (`mockApi.xxx(...)`) is kept identical on purpose so
// none of the page components had to change.
// ---------------------------------------------------------------------------

function toDoc(row) {
  if (!row) return row
  return {
    id: row.id,
    title: row.title,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    category: row.category,
    department: row.department,
    priority: row.priority,
    status: row.status,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    documentNumber: row.document_number,
    pageCount: row.page_count,
    language: row.language,
    ocrText: row.ocr_text,
    ocrConfidence: row.ocr_confidence,
    metadata: row.metadata || {},
    versions: row.versions || [],
    approvals: row.approvals || [],
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
      // Retry inserting log entry without the document_id foreign key constraint
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

export const mockApi = {
  // --- Password reset -------------------------------------------------
  // NOTE: This now sends a real email via Supabase instead of faking an
  // OTP. The 3-step OTP screen in forgot-password.jsx is cosmetic only at
  // this point — it still needs a small rework to handle Supabase's emailed
  // reset link (a /reset-password route reading the recovery token). Flagged
  // as a follow-up; not part of the RBAC/cross-device fix.
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
    const { error } = await supabase.from('documents').delete().eq('id', id)
    ok(error)
    await logAction(user, 'DELETE', 'Deleted document', doc)
    return { success: true }
  },

  async uploadDocument(file, metadata, user, ocrData = null) {
    console.log("OCR Data received:", ocrData);

    // Workflow automation: when OCR ran, use the classifier output + OCR
    // text to auto-pick category/department/priority instead of a random
    // fallback. Manual selections in `metadata` always win over automation.
    const auto = ocrData
      ? autoRouteDocument({
          classification: { type: ocrData.documentType, category: ocrData.category, confidence: ocrData?.metadata?.classificationConfidence },
          ocrText: ocrData.ocrText,
          importantDates: ocrData?.metadata?.importantDates || [],
        })
      : null
    if (auto) console.log('Auto-routing decision:', auto)

    const dept = metadata.department || auto?.department || user.department
    const deptObj = DEPARTMENTS.find((d) => d.id === dept)
    const cat = CATEGORIES.find((c) => c.id === metadata.category)
      || CATEGORIES.find((c) => c.id === auto?.category)
      || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    const priority = PRIORITIES.find((p) => p.id === metadata.priority)
      || PRIORITIES.find((p) => p.id === auto?.priority)
      || PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)]

    const row = {
      title: ocrData?.metadata?.title || metadata.title || file.name.replace(/\.[^.]+$/, ''),
      file_name: file.name,
      file_type: file.name.split('.').pop().toLowerCase(),
      file_size: file.size,
      category: cat.id,
      department:
        dept,
      priority: priority.id,
      status: 'pending',
      uploaded_by: user.id,
      uploaded_by_name: user.name,
      document_number: `GOV/${deptObj?.code || 'GOV'}/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      page_count: ocrData?.pageCount || Math.ceil(file.size / 50000) || 1,
      language: ocrData?.language || 'English',
      ocr_text: ocrData?.ocrText || `OCR extracted text from ${file.name}.\n\nThis is simulated OCR output.`,
      ocr_confidence: ocrData?.ocrConfidence ?? Math.floor(80 + Math.random() * 19),
      metadata: {

        ...ocrData?.metadata,

        title:
            ocrData?.metadata?.title || "",

        organization:
            ocrData?.metadata?.organization || "",

        subject:
            ocrData?.metadata?.subject || "",

        post:
            ocrData?.metadata?.post || "",

        documentNumber:
            ocrData?.metadata?.documentNumber || "",

        summary:
            ocrData?.metadata?.summary || "",

        tags: ocrData?.metadata?.tags || [],

        keywords: ocrData?.metadata?.tags || [],

        personNames: ocrData?.metadata?.personNames || [],

        addresses: ocrData?.metadata?.addresses || [],

        importantDates:
            ocrData?.metadata?.importantDates || [],

        location:
            ocrData?.metadata?.location || "",

        suggestedFolder:
            "",

        confidenceScore:
            ocrData?.ocrConfidence ?? 0,

        routingReason:
            auto?.reason || [],

      },
      versions: [{ version: 1, uploadedAt: new Date().toISOString(), uploadedBy: user.name, fileSize: file.size, note: 'Initial upload' }],
      approvals: [],
    }
    const { data, error } = await supabase.from('documents').insert(row).select().single()
    ok(error)
    const doc = toDoc(data)
    console.log("Inserted document:", doc);
    await logAction(user, 'UPLOAD', 'Uploaded document', doc)
    await addNotification(user.id, 'upload', 'Upload Successful', `Document "${doc.title}" uploaded and OCR completed`)
    return doc
  },

  // --- Public Document Verification (safe public columns only) -----------
  async getPublicDocumentVerification(id) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, status, document_number, department, category, priority, created_at, updated_at, page_count, language, uploaded_by_name, approvals')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Document not found.')
    return toDoc(data)
  },

  // --- Approvals ------------------------------------------------------
  async getApprovals() {
    const { data, error } = await supabase.from('documents').select('*').eq('status', 'pending')
    ok(error)
    return (data || []).map(toDoc)
  },

  async approveDocument(id, comment, user) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)
    const approvals = [...(doc.approvals || []), { id: uid('appr'), action: 'approved', userId: user.id, userName: user.name, comment: comment || 'Approved', timestamp: new Date().toISOString() }]
    const { data, error } = await supabase.from('documents').update({ status: 'approved', approvals }).eq('id', id).select().single()
    ok(error)
    await logAction(user, 'APPROVE', 'Approved document', doc)
    await addNotification(doc.uploadedBy, 'approval', 'Document Approved', `Document "${doc.title}" has been approved`)
    return toDoc(data)
  },

  async rejectDocument(id, comment, user) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)
    const approvals = [...(doc.approvals || []), { id: uid('appr'), action: 'rejected', userId: user.id, userName: user.name, comment: comment || 'Rejected', timestamp: new Date().toISOString() }]
    const { data, error } = await supabase.from('documents').update({ status: 'rejected', approvals }).eq('id', id).select().single()
    ok(error)
    await logAction(user, 'REJECT', 'Rejected document', doc)
    await addNotification(doc.uploadedBy, 'rejected', 'Document Rejected', `Document "${doc.title}" has been rejected`)
    return toDoc(data)
  },

  async requestChanges(id, comment, user) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', id).single()
    const doc = toDoc(existing)
    const approvals = [...(doc.approvals || []), { id: uid('appr'), action: 'changes_requested', userId: user.id, userName: user.name, comment: comment || 'Changes requested', timestamp: new Date().toISOString() }]
    const { data, error } = await supabase.from('documents').update({ status: 'changes', approvals }).eq('id', id).select().single()
    ok(error)
    await logAction(user, 'METADATA_CHANGE', 'Requested changes on document', doc)
    await addNotification(doc.uploadedBy, 'changes', 'Changes Requested', `Document "${doc.title}" requires changes before approval. Please review and resubmit.`)
    return toDoc(data)
  },

  // --- Audit logs (staff only — enforced by RLS) ---------------------
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

  // --- Notifications (per-user) ---------------------------------------
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

  // --- Users (admin-only writes — enforced by RLS + a DB trigger that
  // blocks role/status changes from anyone but an admin) -----------------
  async getUsers() {
    const { data, error } = await supabase.from('profiles').select('*')
    ok(error)
    return (data || []).map(toUser)
  },

  async createUser() {
    // Creating another person's login directly from the client isn't safely
    // possible with just the public (anon) Supabase key — that requires the
    // service_role key, which must never ship to the browser. The secure way
    // to do this is a Supabase Edge Function that uses the admin API.
    // For now: have the person self-register at /register, then promote
    // their role here on the Users page.
    throw new Error('Direct user creation needs a server-side admin call (Supabase Edge Function). Ask the person to self-register at /register, then set their role here.')
  },

  async updateUser(id, data) {
    const { data: updated, error } = await supabase.from('profiles').update(data).eq('id', id).select().single()
    ok(error) // DB trigger throws here if a non-admin tries to sneak in a role/status change
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
  // Falls back to localStorage if the Supabase 'settings' table doesn't
  // exist yet — prevents the blank/frozen page when the table is missing.
  async getSettings() {
    try {
      const { data, error } = await supabase.from('settings').select('data').eq('id', 1).single()
      if (!error && data?.data) {
        // Cache a good copy locally so offline/table-missing still works
        localStorage.setItem('sdds_settings', JSON.stringify(data.data))
        return data.data
      }
    } catch (_) { /* fall through to local fallback */ }

    // Local fallback: previously saved settings OR demo defaults
    const cached = localStorage.getItem('sdds_settings')
    if (cached) {
      try { return JSON.parse(cached) } catch (_) { /* corrupt – use demo */ }
    }
    const { DEMO_SETTINGS } = await import('./mock-data.js')
    return DEMO_SETTINGS
  },

  async updateSettings(patch) {
    // Merge on top of whatever we can read
    let existing = {}
    try {
      const { data } = await supabase.from('settings').select('data').eq('id', 1).single()
      if (data?.data) existing = data.data
    } catch (_) { /* use local */ }

    if (!Object.keys(existing).length) {
      const cached = localStorage.getItem('sdds_settings')
      if (cached) { try { existing = JSON.parse(cached) } catch (_) {} }
    }

    const merged = { ...existing, ...patch }

    // Persist locally first (always succeeds)
    localStorage.setItem('sdds_settings', JSON.stringify(merged))

    // Attempt Supabase write (silently ignored if table missing)
    try {
      const { data, error } = await supabase
        .from('settings')
        .upsert({ id: 1, data: merged })
        .select('data')
        .single()
      if (!error && data?.data) return data.data
    } catch (_) { /* fall through */ }

    return merged
  },

  async searchDocuments(query) {
    const { data, error } = await supabase.from('documents').select('*')
    ok(error)
    const docs = (data || []).map(toDoc)

    // 1. Try Gemini AI semantic search first
    if (isAIAvailable()) {
      try {
        const matchingIds = await aiSearchDocuments(query, docs)
        if (matchingIds && matchingIds.length > 0) {
          const matchedMap = new Map(docs.map((d) => [d.id, d]))
          const aiResults = matchingIds
            .map((id) => matchedMap.get(id))
            .filter(Boolean)
          
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

    // 2. Rule-based Smart Search fallback
    const results = smartSearch(docs, query, { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES })
    const { data: { user } } = await supabase.auth.getUser()
    await logAction(user ? { id: user.id } : null, 'SEARCH', `Searched for: ${query}`)
    return results
  },

  async chatWithDocuments(message) {
    const { data } = await supabase.from('documents').select('*')
    const docs = (data || []).map(toDoc)
    const lookups = { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES }

    // Try Gemini AI chat first (richer, contextual responses)
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

    // Rule-based fallback (unchanged logic)
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

  async getConstants() {
    return { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES, ROLES }
  },
}
