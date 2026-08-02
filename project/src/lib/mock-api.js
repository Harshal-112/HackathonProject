import {
  DEMO_USERS,
  DEMO_DOCUMENTS,
  DEMO_APPROVALS,
  DEMO_AUDIT_LOGS,
  DEMO_NOTIFICATIONS,
  DEMO_SETTINGS,
  DEPARTMENTS,
  CATEGORIES,
  PRIORITIES,
  DOC_STATUSES,
  ROLES,
} from './mock-data.js'
import { uid, sleep, paginate, sortBy } from './utils.js'

const STORAGE_KEY = 'sdds_db_v1'

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
    } catch {
      // fall through to seed
    }
  }
  const db = {
    users: [],
    documents: DEMO_DOCUMENTS,
    approvals: DEMO_APPROVALS,
    auditLogs: DEMO_AUDIT_LOGS,
    notifications: DEMO_NOTIFICATIONS,
    settings: DEMO_SETTINGS,
  }
  saveDB(db)
  return db
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function logAction(db, user, action, description, doc = null) {
  const log = {
    id: uid('log'),
    userId: user?.id || 'system',
    userName: user?.name || 'System',
    userRole: user?.role || 'system',
    action,
    description,
    documentId: doc?.id || null,
    documentTitle: doc?.title || null,
    timestamp: new Date().toISOString(),
    ipAddress: '10.0.0.1',
    userAgent: navigator.userAgent,
  }
  db.auditLogs.unshift(log)
  if (db.auditLogs.length > 200) db.auditLogs = db.auditLogs.slice(0, 200)
}

function addNotification(db, type, title, message) {
  db.notifications.unshift({
    id: uid('n'),
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  })
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50)
}

export const mockApi = {
  async login(email, password) {
    await sleep(600)
    const db = loadDB()
    const user = db.users.find((u) => u.email === email && u.password === password)
    if (!user) throw new Error('Invalid email or password')
    if (user.status !== 'active') throw new Error('Account is deactivated. Contact administrator.')
    user.lastLogin = new Date().toISOString()
    saveDB(db)
    const { password: _pw, ...safeUser } = user
    logAction(db, user, 'LOGIN', 'User logged in')
    saveDB(db)
    return { user: safeUser, token: `mock_jwt_${user.id}_${Date.now()}` }
  },

  async register(data) {
    await sleep(600)
    const db = loadDB()
    if (db.users.find((u) => u.email === data.email)) {
      throw new Error('Email already registered')
    }
    const user = {
      id: uid('u'),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role || 'citizen',
      department: data.department || 'panchayat',
      designation: data.designation || 'Citizen',
      phone: data.phone || '',
      status: 'active',
      avatar: '',
      createdAt: new Date().toISOString(),
      lastLogin: null,
    }
    db.users.push(user)
    saveDB(db)
    const { password: _pw, ...safeUser } = user
    return { user: safeUser, token: `mock_jwt_${user.id}_${Date.now()}` }
  },

  async forgotPassword(email) {
    await sleep(500)
    const db = loadDB()
    const user = db.users.find((u) => u.email === email)
    if (!user) throw new Error('No account found with this email')
    return { message: 'Password reset link sent to your email', otp: '4281' }
  },

  async resetPassword(email, otp, newPassword) {
    await sleep(500)
    const db = loadDB()
    const user = db.users.find((u) => u.email === email)
    if (!user) throw new Error('User not found')
    user.password = newPassword
    saveDB(db)
    return { message: 'Password reset successfully' }
  },

  async getDashboardStats(user) {
    await sleep(300)
    const db = loadDB()
    const docs = db.documents
    const today = new Date().setHours(0, 0, 0, 0)
    const stats = {
      totalDocuments: docs.length,
      pendingApprovals: docs.filter((d) => d.status === 'pending').length,
      todaysUploads: docs.filter((d) => new Date(d.createdAt).setHours(0, 0, 0, 0) === today).length,
      approvedDocuments: docs.filter((d) => d.status === 'approved').length,
      rejectedDocuments: docs.filter((d) => d.status === 'rejected').length,
      totalUsers: db.users.length,
      totalDepartments: db.settings.departments.length,
      ocrProcessed: docs.filter((d) => d.ocrText).length,
    }
    const byDepartment = DEPARTMENTS.map((d) => ({
      name: d.code,
      fullName: d.name,
      count: docs.filter((doc) => doc.department === d.id).length,
    }))
    const byCategory = CATEGORIES.map((c) => ({
      name: c.name,
      count: docs.filter((doc) => doc.category === c.id).length,
    }))
    const byStatus = DOC_STATUSES.map((s) => ({
      name: s.name,
      count: docs.filter((doc) => doc.status === s.id).length,
    }))
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      const dayStart = date.setHours(0, 0, 0, 0)
      const dayEnd = dayStart + 86400000
      return {
        date: new Date(dayStart).toLocaleDateString('en-IN', { weekday: 'short' }),
        uploads: docs.filter((d) => {
          const t = new Date(d.createdAt).getTime()
          return t >= dayStart && t < dayEnd
        }).length,
        approvals: db.auditLogs.filter((l) => l.action === 'APPROVE' && new Date(l.timestamp).getTime() >= dayStart && new Date(l.timestamp).getTime() < dayEnd).length,
      }
    })
    const recentDocuments = [...docs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
    const recentActivity = db.auditLogs.slice(0, 8)
    return { stats, byDepartment, byCategory, byStatus, last7Days, recentDocuments, recentActivity }
  },

  async getDocuments(params = {}) {
    await sleep(300)
    const db = loadDB()
    let docs = [...db.documents]
    if (params.department) docs = docs.filter((d) => d.department === params.department)
    if (params.category) docs = docs.filter((d) => d.category === params.category)
    if (params.status) docs = docs.filter((d) => d.status === params.status)
    if (params.priority) docs = docs.filter((d) => d.priority === params.priority)
    if (params.search) {
      const q = params.search.toLowerCase()
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          (d.ocrText || '').toLowerCase().includes(q) ||
          (d.metadata?.summary || '').toLowerCase().includes(q) ||
          (d.metadata?.tags || []).some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (params.sortBy) docs = sortBy(docs, params.sortBy, params.sortDir || 'asc')
    else docs = sortBy(docs, 'createdAt', 'desc')
    const total = docs.length
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const items = paginate(docs, page, pageSize)
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getDocument(id) {
    await sleep(200)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    return doc
  },

  async updateDocument(id, data, user) {
    await sleep(400)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    Object.assign(doc, data)
    doc.updatedAt = new Date().toISOString()
    doc.versions.push({
      version: doc.versions.length + 1,
      uploadedAt: doc.updatedAt,
      uploadedBy: user.name,
      fileSize: doc.fileSize,
      note: 'Metadata updated',
    })
    logAction(db, user, 'METADATA_CHANGE', 'Updated document metadata', doc)
    saveDB(db)
    return doc
  },

  async deleteDocument(id, user) {
    await sleep(300)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    db.documents = db.documents.filter((d) => d.id !== id)
    logAction(db, user, 'DELETE', 'Deleted document', doc)
    saveDB(db)
    return { success: true }
  },

  async uploadDocument(file, metadata, user, ocrData = null) {
    await sleep(1200)
    const db = loadDB()
    const dept = metadata.department || user.department
    const deptObj = DEPARTMENTS.find((d) => d.id === dept)
    const cat = CATEGORIES.find((c) => c.id === metadata.category) || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    const priority = PRIORITIES.find((p) => p.id === metadata.priority) || PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)]
    const ext = file.name.split('.').pop().toLowerCase()
    const doc = {
      id: uid('doc'),
      title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      fileType: ext,
      fileSize: file.size,
      category: cat.id,
      department: dept,
      priority: priority.id,
      status: 'pending',
      uploadedBy: user.id,
      uploadedByName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentNumber: `GOV/${deptObj?.code || 'GOV'}/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      pageCount: ocrData?.pageCount || Math.ceil(file.size / 50000) || 1,
      language: ocrData?.language || 'English',
      ocrText: ocrData?.ocrText || `OCR extracted text from ${file.name}.\n\nThis is simulated OCR output.`,
      ocrConfidence: ocrData?.ocrConfidence ?? Math.floor(80 + Math.random() * 19),
      metadata: {
        summary: `AI-generated summary of ${file.name}. This document has been automatically analyzed and classified.`,
        tags: ['auto-tagged', cat.id, dept],
        keywords: [cat.name, deptObj?.name, 'government'],
        personNames: [],
        addresses: [],
        importantDates: ocrData?.metadata?.importantDates || [],
        location: ocrData?.metadata?.location || 'Pune',
        suggestedFolder: `${deptObj?.name}/${cat.name}`,
        confidenceScore: ocrData?.ocrConfidence ?? Math.floor(80 + Math.random() * 19),
      },
      versions: [
        {
          version: 1,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.name,
          fileSize: file.size,
          note: 'Initial upload',
        },
      ],
      approvals: [],
    }
    db.documents.unshift(doc)
    logAction(db, user, 'UPLOAD', 'Uploaded document', doc)
    addNotification(db, 'upload', 'Upload Successful', `Document "${doc.title}" uploaded and OCR completed`)
    saveDB(db)
    return doc
  },

  async getApprovals() {
    await sleep(300)
    const db = loadDB()
    return db.documents.filter((d) => d.status === 'pending')
  },

  async approveDocument(id, comment, user) {
    await sleep(500)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    doc.status = 'approved'
    doc.approvals.push({
      id: uid('appr'),
      action: 'approved',
      userId: user.id,
      userName: user.name,
      comment: comment || 'Approved',
      timestamp: new Date().toISOString(),
    })
    logAction(db, user, 'APPROVE', 'Approved document', doc)
    addNotification(db, 'approval', 'Document Approved', `Document "${doc.title}" has been approved`)
    saveDB(db)
    return doc
  },

  async rejectDocument(id, comment, user) {
    await sleep(500)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    doc.status = 'rejected'
    doc.approvals.push({
      id: uid('appr'),
      action: 'rejected',
      userId: user.id,
      userName: user.name,
      comment: comment || 'Rejected',
      timestamp: new Date().toISOString(),
    })
    logAction(db, user, 'REJECT', 'Rejected document', doc)
    addNotification(db, 'rejected', 'Document Rejected', `Document "${doc.title}" has been rejected`)
    saveDB(db)
    return doc
  },

  async requestChanges(id, comment, user) {
    await sleep(500)
    const db = loadDB()
    const doc = db.documents.find((d) => d.id === id)
    if (!doc) throw new Error('Document not found')
    doc.status = 'changes'
    doc.approvals.push({
      id: uid('appr'),
      action: 'changes_requested',
      userId: user.id,
      userName: user.name,
      comment: comment || 'Changes requested',
      timestamp: new Date().toISOString(),
    })
    logAction(db, user, 'METADATA_CHANGE', 'Requested changes on document', doc)
    saveDB(db)
    return doc
  },

  async getAuditLogs(params = {}) {
    await sleep(300)
    const db = loadDB()
    let logs = [...db.auditLogs]
    if (params.action) logs = logs.filter((l) => l.action === params.action)
    if (params.userId) logs = logs.filter((l) => l.userId === params.userId)
    if (params.search) {
      const q = params.search.toLowerCase()
      logs = logs.filter((l) => l.userName.toLowerCase().includes(q) || l.description.toLowerCase().includes(q))
    }
    const total = logs.length
    const page = params.page || 1
    const pageSize = params.pageSize || 20
    const items = paginate(logs, page, pageSize)
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  },

  async getNotifications() {
    await sleep(200)
    const db = loadDB()
    return db.notifications
  },

  async markNotificationRead(id) {
    await sleep(100)
    const db = loadDB()
    const n = db.notifications.find((x) => x.id === id)
    if (n) n.read = true
    saveDB(db)
    return n
  },

  async markAllNotificationsRead() {
    await sleep(100)
    const db = loadDB()
    db.notifications.forEach((n) => (n.read = true))
    saveDB(db)
    return db.notifications
  },

  async getUsers() {
    await sleep(300)
    const db = loadDB()
    return db.users.map(({ password, ...u }) => u)
  },

  async createUser(data) {
    await sleep(400)
    const db = loadDB()
    if (db.users.find((u) => u.email === data.email)) throw new Error('Email already exists')
    const user = {
      id: uid('u'),
      name: data.name,
      email: data.email,
      password: data.password || 'Default@123',
      role: data.role || 'citizen',
      department: data.department || 'panchayat',
      designation: data.designation || '',
      phone: data.phone || '',
      status: 'active',
      avatar: '',
      createdAt: new Date().toISOString(),
      lastLogin: null,
    }
    db.users.push(user)
    saveDB(db)
    const { password, ...safe } = user
    return safe
  },

  async updateUser(id, data) {
    await sleep(400)
    const db = loadDB()
    const user = db.users.find((u) => u.id === id)
    if (!user) throw new Error('User not found')
    Object.assign(user, data)
    saveDB(db)
    const { password, ...safe } = user
    return safe
  },

  async deleteUser(id) {
    await sleep(300)
    const db = loadDB()
    db.users = db.users.filter((u) => u.id !== id)
    saveDB(db)
    return { success: true }
  },

  async getReports(params = {}) {
    await sleep(400)
    const db = loadDB()
    const docs = db.documents
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
    const byUser = db.users.map((u) => ({
      user: u.name,
      role: u.role,
      count: filtered.filter((doc) => doc.uploadedBy === u.id).length,
    })).filter((x) => x.count > 0)
    const byType = CATEGORIES.map((c) => ({
      type: c.name,
      count: filtered.filter((doc) => doc.category === c.id).length,
    }))
    return {
      period,
      total: filtered.length,
      byDepartment,
      byUser,
      byType,
      generatedAt: new Date().toISOString(),
    }
  },

  async getSettings() {
    await sleep(200)
    const db = loadDB()
    return db.settings
  },

  async updateSettings(data) {
    await sleep(400)
    const db = loadDB()
    db.settings = { ...db.settings, ...data }
    saveDB(db)
    return db.settings
  },

  async searchDocuments(query) {
    await sleep(400)
    const db = loadDB()
    const q = query.toLowerCase()
    const results = db.documents.filter((d) => {
      return (
        d.title.toLowerCase().includes(q) ||
        d.documentNumber.toLowerCase().includes(q) ||
        (d.ocrText || '').toLowerCase().includes(q) ||
        (d.metadata?.summary || '').toLowerCase().includes(q) ||
        (d.metadata?.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (d.metadata?.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
        (d.metadata?.personNames || []).some((n) => n.toLowerCase().includes(q)) ||
        d.uploadedByName.toLowerCase().includes(q)
      )
    })
    logAction(db, null, 'SEARCH', `Searched for: ${query}`)
    saveDB(db)
    return results
  },

  async chatWithDocuments(message, user) {
    await sleep(800)
    const db = loadDB()
    const q = message.toLowerCase()
    let response = ''
    if (q.includes('how many') || q.includes('total') || q.includes('count')) {
      response = `There are currently ${db.documents.length} documents in the system. ${db.documents.filter((d) => d.status === 'pending').length} are pending approval, ${db.documents.filter((d) => d.status === 'approved').length} have been approved, and ${db.documents.filter((d) => d.status === 'rejected').length} have been rejected.`
    } else if (q.includes('pending') || q.includes('approval')) {
      const pending = db.documents.filter((d) => d.status === 'pending').slice(0, 5)
      response = `There are ${db.documents.filter((d) => d.status === 'pending').length} documents pending approval. Here are the most recent ones:\n\n${pending.map((d) => `• ${d.title} (uploaded by ${d.uploadedByName})`).join('\n')}`
    } else if (q.includes('land') || q.includes('property')) {
      const land = db.documents.filter((d) => d.title.toLowerCase().includes('land') || d.title.toLowerCase().includes('property') || d.category === 'land').slice(0, 5)
      response = `I found ${land.length} land/property related documents:\n\n${land.map((d) => `• ${d.title} - ${d.documentNumber}`).join('\n')}`
    } else if (q.includes('upload') || q.includes('recent')) {
      const recent = [...db.documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
      response = `Here are the 5 most recently uploaded documents:\n\n${recent.map((d) => `• ${d.title} (uploaded ${new Date(d.createdAt).toLocaleDateString('en-IN')})`).join('\n')}`
    } else if (q.includes('department')) {
      const deptCounts = DEPARTMENTS.map((d) => ({ name: d.name, count: db.documents.filter((doc) => doc.department === d.id).length })).sort((a, b) => b.count - a.count)
      response = `Documents by department:\n\n${deptCounts.map((d) => `• ${d.name}: ${d.count}`).join('\n')}`
    } else {
      const matching = db.documents.filter((d) => d.title.toLowerCase().includes(q) || (d.ocrText || '').toLowerCase().includes(q)).slice(0, 5)
      if (matching.length) {
        response = `I found ${matching.length} documents matching your query:\n\n${matching.map((d) => `• ${d.title} - ${d.documentNumber}`).join('\n')}`
      } else {
        response = `I couldn't find any documents matching "${message}". Try asking about document counts, pending approvals, recent uploads, or documents by department.`
      }
    }
    return { response }
  },

  async getConstants() {
    return { DEPARTMENTS, CATEGORIES, PRIORITIES, DOC_STATUSES, ROLES }
  },
}
