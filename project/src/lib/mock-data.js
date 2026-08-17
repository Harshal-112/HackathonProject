import { uid } from './utils.js'

export const DEPARTMENTS = [
  { id: 'revenue', name: 'Revenue Department', code: 'REV' },
  { id: 'rto', name: 'Transport (RTO)', code: 'RTO' },
  { id: 'municipal', name: 'Municipal Corporation', code: 'MUN' },
  { id: 'panchayat', name: 'Gram Panchayat', code: 'GP' },
  { id: 'collector', name: "Collector's Office", code: 'COL' },
  { id: 'health', name: 'Health Department', code: 'HLT' },
  { id: 'education', name: 'Education Department', code: 'EDU' },
  { id: 'agri', name: 'Agriculture Department', code: 'AGR' },
]

export const CATEGORIES = [
  { id: 'land', name: 'Land Records', color: '#1e40af' },
  { id: 'license', name: 'Licenses & Permits', color: '#0891b2' },
  { id: 'certificate', name: 'Certificates', color: '#059669' },
  { id: 'application', name: 'Applications', color: '#d97706' },
  { id: 'notice', name: 'Notices & Circulars', color: '#dc2626' },
  { id: 'register', name: 'Registers', color: '#7c3aed' },
  { id: 'report', name: 'Reports', color: '#0f766e' },
  { id: 'correspondence', name: 'Correspondence', color: '#475569' },
]

export const PRIORITIES = [
  { id: 'low', name: 'Low', color: '#64748b' },
  { id: 'medium', name: 'Medium', color: '#d97706' },
  { id: 'high', name: 'High', color: '#dc2626' },
  { id: 'urgent', name: 'Urgent', color: '#b91c1c' },
]

export const DOC_STATUSES = [
  { id: 'draft', name: 'Draft', color: '#64748b' },
  { id: 'pending', name: 'Pending Approval', color: '#d97706' },
  { id: 'approved', name: 'Approved', color: '#059669' },
  { id: 'rejected', name: 'Rejected', color: '#dc2626' },
  { id: 'changes', name: 'Changes Requested', color: '#0891b2' },
  { id: 're_verification', name: 'Re-verification Required', color: '#7c3aed' },
  { id: 'archived', name: 'Archived', color: '#475569' },
]

export const ROLES = [
  { id: 'admin', name: 'Administrator' },
  { id: 'officer', name: 'Officer' },
  { id: 'verifier', name: 'Verifier' },
  { id: 'citizen', name: 'Citizen' },
]

export const DEMO_USERS = [
  {
    id: 'u_admin',
    name: 'Rajesh Kumar Sharma',
    email: 'admin@gov.in',
    password: 'Admin@123',
    role: 'admin',
    department: 'collector',
    designation: 'District Collector',
    phone: '+91 98765 43210',
    status: 'active',
    avatar: '',
    createdAt: '2024-01-15T09:00:00Z',
    lastLogin: '2026-07-30T08:45:00Z',
  },
  {
    id: 'u_officer',
    name: 'Priya Nair',
    email: 'officer@gov.in',
    password: 'Officer@123',
    role: 'officer',
    department: 'revenue',
    designation: 'Revenue Officer',
    phone: '+91 98765 43211',
    status: 'active',
    avatar: '',
    createdAt: '2024-02-10T09:00:00Z',
    lastLogin: '2026-07-31T10:20:00Z',
  },
  {
    id: 'u_verifier',
    name: 'Amit Patel',
    email: 'verifier@gov.in',
    password: 'Verifier@123',
    role: 'verifier',
    department: 'rto',
    designation: 'Document Verifier',
    phone: '+91 98765 43212',
    status: 'active',
    avatar: '',
    createdAt: '2024-03-05T09:00:00Z',
    lastLogin: '2026-07-31T09:15:00Z',
  },
  {
    id: 'u_citizen',
    name: 'Sunita Deshmukh',
    email: 'citizen@gov.in',
    password: 'Citizen@123',
    role: 'citizen',
    department: 'panchayat',
    designation: 'Citizen',
    phone: '+91 98765 43213',
    status: 'active',
    avatar: '',
    createdAt: '2024-04-20T09:00:00Z',
    lastLogin: '2026-07-28T14:30:00Z',
  },
  {
    id: 'u_officer2',
    name: 'Mahesh Reddy',
    email: 'm.reddy@gov.in',
    password: 'Officer@123',
    role: 'officer',
    department: 'municipal',
    designation: 'Municipal Commissioner',
    phone: '+91 98765 43214',
    status: 'active',
    avatar: '',
    createdAt: '2024-05-12T09:00:00Z',
    lastLogin: '2026-07-29T11:00:00Z',
  },
  {
    id: 'u_verifier2',
    name: 'Lakshmi Iyer',
    email: 'l.iyer@gov.in',
    password: 'Verifier@123',
    role: 'verifier',
    department: 'health',
    designation: 'Senior Verifier',
    phone: '+91 98765 43215',
    status: 'inactive',
    avatar: '',
    createdAt: '2024-06-01T09:00:00Z',
    lastLogin: '2026-06-15T16:45:00Z',
  },
]

const SAMPLE_TITLES = [
  '7/12 Land Record Extract - Survey No 142',
  'Property Tax Assessment Notice - Ward 12',
  'Birth Certificate Application - Form B-3',
  'Driving License Renewal - DL-04201900XXXX',
  'Mutation Entry Order - Village Kanhur',
  'Building Permission Application - BP/2026/0891',
  'Caste Validity Certificate - CVC-2026-441',
  'GST Registration Cancellation Notice',
  'Water Connection Application - WC-2026-1123',
  'Encumbrance Certificate - EC-2026-7782',
  'Trade License Renewal - TL/2026/0455',
  'Death Certificate Registration - Form B-2',
  'Income Certificate Application - IC-2026-3321',
  'Non-Creamy Layer Certificate - NCL-2026-889',
  'Property Card - City Survey No 55',
  'RTO Vehicle Transfer Application',
  'Khasra Extract - Kh No 78/2',
  'Gram Panchayat Resolution - GP/2026/22',
  'Health License Renewal - Food Safety',
  'Mutation Petition - Case No 45/2026',
]

const SAMPLE_SUMMARIES = [
  'This document is a land record extract containing ownership details, survey number, area measurement, and cultivation information for agricultural land.',
  'Property tax assessment notice detailing annual tax payable, ward number, property usage type, and assessment year for the mentioned property.',
  'Application form for birth certificate with applicant details, place of birth, parents information, and supporting documents attached.',
  'Driving license renewal application containing existing license number, validity period, medical fitness declaration, and fee payment receipt.',
  'Mutation entry order authorizing change in land ownership records following a registered sale deed. Contains order number, parties, and survey details.',
  'Building permission application with site plan, structural drawings, ownership proof, and NOC certificates from concerned departments.',
  'Caste validity certificate application with supporting evidence, school records, and ancestral documents for verification.',
  'GST registration cancellation notice citing non-filing of returns for consecutive periods. Contains registration number and outstanding dues.',
  'Water connection application with property details, connection type requested, pipe diameter, and security deposit information.',
  'Encumbrance certificate showing transactions registered against the property for the specified period, confirming clear title status.',
]

const SAMPLE_NAMES = [
  'Rajesh Kumar Sharma',
  'Priya Nair',
  'Amit Patel',
  'Sunita Deshmukh',
  'Mahesh Reddy',
  'Lakshmi Iyer',
  'Vikram Singh',
  'Anjali Gupta',
  'Deepak Joshi',
  'Meera Krishnan',
  'Sanjay Verma',
  'Rohit Deshpande',
]

const SAMPLE_ADDRESSES = [
  'Plot 14, Gandhi Nagar, Pune, Maharashtra 411001',
  'House No 78, Sector 9, Nashik, Maharashtra 422002',
  'Survey No 142, Village Kanhur, Khed, Pune 412501',
  'Flat 302, Sai Apartments, Aurangabad 431001',
  '12, Main Road, Nagpur, Maharashtra 440001',
  'Plot 55, MIDC, Kolhapur 416005',
]

const SAMPLE_TAGS = [
  'land-record',
  'revenue',
  'property',
  'certificate',
  'application',
  'rto',
  'tax',
  'urgent',
  'pending',
  'verified',
  'mutation',
  'building',
  'caste',
  'gst',
  'water',
  'encumbrance',
]

const FILE_TYPES = ['pdf', 'jpg', 'png', 'docx']
const DOC_LANGUAGES = ['English', 'Marathi', 'Hindi', 'Bilingual']

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateOcrText(index) {
  const title = SAMPLE_TITLES[index % SAMPLE_TITLES.length]
  const name = pick(SAMPLE_NAMES)
  const address = pick(SAMPLE_ADDRESSES)
  const dept = pick(DEPARTMENTS)
  const date = new Date(2026, randInt(0, 6), randInt(1, 28)).toLocaleDateString('en-IN')
  return `Government of Maharashtra
${dept.name}
Document: ${title}
Reference No: GOV/${dept.code}/2026/${randInt(1000, 9999)}

Date: ${date}

Applicant/Party: ${name}
Address: ${address}

This is to certify that the above-mentioned document has been verified and
found to be in order. The contents of this document pertain to ${dept.name.toLowerCase()}
proceedings under the relevant government regulations.

Details:
- Application Number: APP/${randInt(10000, 99999)}/2026
- Survey/Khasra Number: ${randInt(1, 999)}/${randInt(1, 20)}
- Area: ${randInt(1, 50)}.${randInt(10, 99)} Hectares
- Assessment Year: 2026-27

Signature of Issuing Authority
${pick(SAMPLE_NAMES)}
${dept.name}`
}

function generateDocuments(count) {
  const docs = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const dept = pick(DEPARTMENTS)
    const cat = pick(CATEGORIES)
    const priority = pick(PRIORITIES)
    const status = i < 6 ? DOC_STATUSES[1] : pick(DOC_STATUSES)
    const uploader = pick(DEMO_USERS.filter((u) => u.role !== 'citizen'))
    const title = SAMPLE_TITLES[i % SAMPLE_TITLES.length]
    const fileType = pick(FILE_TYPES)
    const createdAt = new Date(now - randInt(0, 120) * 86400000).toISOString()
    const ocrText = generateOcrText(i)
    const confidence = randInt(72, 99)

    docs.push({
      id: `doc_${String(i + 1).padStart(4, '0')}`,
      title,
      fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.${fileType}`,
      fileType,
      fileSize: randInt(50000, 5000000),
      category: cat.id,
      department: dept.id,
      priority: priority.id,
      status: status.id,
      uploadedBy: uploader.id,
      uploadedByName: uploader.name,
      createdAt,
      updatedAt: createdAt,
      documentNumber: `GOV/${dept.code}/2026/${randInt(1000, 9999)}`,
      pageCount: randInt(1, 12),
      language: pick(DOC_LANGUAGES),
      ocrText,
      ocrConfidence: confidence,
      metadata: {
        summary: SAMPLE_SUMMARIES[i % SAMPLE_SUMMARIES.length],
        tags: pickN(SAMPLE_TAGS, randInt(2, 5)),
        keywords: pickN(SAMPLE_TAGS, 3),
        personNames: pickN(SAMPLE_NAMES, randInt(1, 3)),
        addresses: pickN(SAMPLE_ADDRESSES, randInt(1, 2)),
        importantDates: [
          new Date(now - randInt(0, 60) * 86400000).toISOString().slice(0, 10),
          new Date(now + randInt(1, 90) * 86400000).toISOString().slice(0, 10),
        ],
        location: pick(['Pune', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad', 'Mumbai']),
        suggestedFolder: `${dept.name}/${cat.name}`,
        confidenceScore: confidence,
      },
      versions: [
        {
          version: 1,
          uploadedAt: createdAt,
          uploadedBy: uploader.name,
          fileSize: randInt(50000, 5000000),
          note: 'Initial upload',
        },
      ],
      approvals: [],
    })
  }
  return docs
}

export const DEMO_DOCUMENTS = generateDocuments(48)

export const DEMO_APPROVALS = DEMO_DOCUMENTS.filter((d) => d.status === 'pending').slice(0, 8).map((d, i) => ({
  id: `appr_${i + 1}`,
  documentId: d.id,
  documentTitle: d.title,
  requestedBy: d.uploadedByName,
  requestedAt: d.createdAt,
  status: 'pending',
  comments: [],
}))

function generateAuditLogs() {
  const actions = [
    { action: 'LOGIN', description: 'User logged in' },
    { action: 'LOGOUT', description: 'User logged out' },
    { action: 'UPLOAD', description: 'Uploaded document' },
    { action: 'DOWNLOAD', description: 'Downloaded document' },
    { action: 'DELETE', description: 'Deleted document' },
    { action: 'APPROVE', description: 'Approved document' },
    { action: 'REJECT', description: 'Rejected document' },
    { action: 'METADATA_CHANGE', description: 'Updated metadata' },
    { action: 'SEARCH', description: 'Performed search' },
  ]
  const logs = []
  for (let i = 0; i < 60; i++) {
    const user = pick(DEMO_USERS)
    const action = pick(actions)
    const doc = action.action !== 'LOGIN' && action.action !== 'LOGOUT' && action.action !== 'SEARCH' ? pick(DEMO_DOCUMENTS) : null
    logs.push({
      id: `log_${String(i + 1).padStart(4, '0')}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: action.action,
      description: action.description,
      documentId: doc?.id || null,
      documentTitle: doc?.title || null,
      timestamp: new Date(Date.now() - randInt(0, 720) * 3600000).toISOString(),
      ipAddress: `10.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0',
    })
  }
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export const DEMO_AUDIT_LOGS = generateAuditLogs()

export const DEMO_NOTIFICATIONS = [
  { id: 'n1', type: 'approval', title: 'Approval Required', message: 'Document "7/12 Land Record Extract" needs your approval', read: false, createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'n2', type: 'upload', title: 'Upload Successful', message: 'Document "Property Tax Assessment Notice" uploaded and OCR completed', read: false, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'n3', type: 'rejected', title: 'Document Rejected', message: 'Document "Building Permission Application" was rejected by the verifier', read: false, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'n4', type: 'approval', title: 'Approved', message: 'Document "Birth Certificate Application" has been approved', read: true, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'n5', type: 'upload', title: 'Upload Successful', message: 'Document "Driving License Renewal" uploaded successfully', read: true, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
]

export const DEMO_SETTINGS = {
  theme: 'light',
  ai: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    autoClassify: true,
    autoSummarize: true,
    autoTag: true,
    confidenceThreshold: 70,
    xaiEnabled: true,
    xaiVerbosity: 'detailed',
  },
  ocr: {
    language: 'eng+mar+hin',
    autoRun: true,
    enhanceImage: true,
    extractTables: true,
  },
  notifications: {
    approvals: true,
    uploads: true,
    system: true,
    email: false,
  },
  privacy: {
    localOnly: false,
    piiMasking: {
      aadhaar: true,
      pan: true,
      phone: true,
      email: true,
      gst: true,
    },
    dataRetention: '90 days',
    auditLog: true,
  },
  departments: DEPARTMENTS,
  categories: CATEGORIES,
}
