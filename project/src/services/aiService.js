// ---------------------------------------------------------------------------
// aiService.js
//
// Free AI-powered document analysis.
// Falls back gracefully to rule-based extraction when:
//   - No API key is configured (VITE_GEMINI_API_KEY not set)
//   - Strict Confidentiality Mode is active (user toggled it ON)
//   - Quota is exceeded (429)
//   - Network error / any other failure
//
// Free AI tier:
//   - 15 requests per minute
//   - 1,500 requests per day
//   - No credit card required
//
// Usage:
//   import { enhanceMetadataWithAI, chatWithAI } from '@/services/aiService'
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Try these model names in order — placing active working models first
const AI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
]

export function isAIAvailable() {
  // Accepts both traditional 'AIza...' keys and new Google AI Studio 'AQ...' keys
  return Boolean(
    GEMINI_API_KEY &&
    GEMINI_API_KEY.trim() !== '' &&
    (GEMINI_API_KEY.startsWith('AIza') || GEMINI_API_KEY.startsWith('AQ.'))
  )
}

// ---------------------------------------------------------------------------
// Check if Strict Confidentiality Mode is active (reads localStorage directly
// so it works outside React without needing the context).
// ---------------------------------------------------------------------------
export function isConfidentialMode() {
  try {
    return localStorage.getItem('sdds_confidential_mode') === 'true'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// PII Masker — replaces citizen-specific sensitive data before sending
// any text to external AI. Document structure / headings are preserved.
// ---------------------------------------------------------------------------
export function maskPII(text) {
  if (!text) return text
  return text
    // Aadhaar: 12 digit groups (xxxx xxxx xxxx or xxxx-xxxx-xxxx)
    .replace(/\b(\d{4})[\s-](\d{4})[\s-](\d{4})\b/g, '[AADHAAR_REDACTED]')
    // PAN card: AAAAA9999A
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[PAN_REDACTED]')
    // GST: 15-char GST format
    .replace(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/g, '[GST_REDACTED]')
    // Phone numbers (Indian formats)
    .replace(/\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g, '[PHONE_REDACTED]')
    // Email addresses
    .replace(/[\w._%+-]+@[\w.-]+\.[a-z]{2,}/gi, '[EMAIL_REDACTED]')
    // Voter ID: 3 letters + 7 digits
    .replace(/\b[A-Z]{3}[0-9]{7}\b/g, '[VOTERID_REDACTED]')
    // Passport: 1 letter + 7 digits
    .replace(/\b[A-Z][0-9]{7}\b/g, '[PASSPORT_REDACTED]')
}

// ---------------------------------------------------------------------------
// Core fetch wrapper — tries each model name in order, stops on first success
// ---------------------------------------------------------------------------
async function callGemini(parts, systemInstruction = '') {
  if (!isAIAvailable()) {
    throw new Error('AI key not configured')
  }

  // Mask PII in all text parts before sending
  const safeParts = parts.map((p) =>
    p.text ? { ...p, text: maskPII(p.text) } : p
  )

  const body = {
    contents: [{ role: 'user', parts: safeParts }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  let lastError = null
  for (const model of AI_MODELS) {
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || res.statusText
        lastError = new Error(`AI service error ${res.status}: ${msg}`)
        console.warn(`[AI] Model ${model} returned ${res.status} (${msg}), trying next model...`)
        continue
      }

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (text) {
        console.log(`[AI] Successfully generated content using model: ${model}`)
        return text
      }
    } catch (err) {
      lastError = err
      console.warn(`[AI] Network error calling ${model}: ${err.message}, trying next model...`)
      continue
    }
  }

  throw lastError || new Error('No working AI model available')
}


// ---------------------------------------------------------------------------
// Parse JSON from Gemini (robust with fallback sanitization)
// ---------------------------------------------------------------------------
function parseJsonResponse(raw) {
  if (!raw) return null

  // 1. Extract markdown code block content if present
  let cleaned = raw.trim()
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  // 2. Extract outermost { ... }
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    cleaned = jsonObjectMatch[0].trim()
  }

  // 3. Try direct JSON parse
  try {
    return JSON.parse(cleaned)
  } catch (_) {
    // 4. Sanitize common LLM JSON syntax anomalies:
    // - Remove trailing commas before } or ]
    // - Escape unescaped control chars / newlines in JSON strings
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1') // trailing commas
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
          if (match === '\n') return '\\n'
          if (match === '\r') return '\\r'
          if (match === '\t') return '\\t'
          return ''
        })
      return JSON.parse(sanitized)
    } catch (err) {
      console.warn('JSON parse failed after sanitization:', err.message)
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// MAIN: Enhance OCR-extracted metadata with Gemini
// ---------------------------------------------------------------------------
const METADATA_SYSTEM_PROMPT = `You are an expert in analyzing Indian government documents, including Maharashtra state government documents in English, Marathi (Devanagari script), and Hindi. 
Extract structured information from the OCR text and return ONLY valid JSON with no explanation.
Be precise. If a field cannot be determined, use null or an empty array.

CRITICAL FOR TITLE EXTRACTION:
- The "title" field MUST be the specific subject/topic of the document (e.g., "7/12 Land Extract", "Professor Recruitment Notice / प्राध्यापक पद भरती संदर्भात", "Caste Validity Certificate Application"), NOT just the name of the issuing university or government office (like "Savitribai Phule Pune University" or "Government of Maharashtra").
- If the document is in Marathi or Hindi, provide a clean title in Devanagari script, followed by a brief English translation in parentheses e.g. "प्राध्यापक पद भरती (Recruitment of Professor)".
- Clean up any OCR typos or broken letters.`

const METADATA_USER_TEMPLATE = (ocrText) => `Analyze this OCR-extracted text from an Indian government document and return a JSON object with exactly these fields:

{
  "title": "document title or subject line (string or null)",
  "organization": "issuing government organization/office name (string or null)",
  "documentType": "one of: Invoice, Aadhaar Card, Passport, Birth Certificate, Death Certificate, Marriage Certificate, Affidavit, Court Order, Land Record (7/12), Property Card, NOC, Trade License, Ration Card, Income Certificate, Caste Certificate, Domicile Certificate, FIR, University Document, Certificate, Government Order/Letter, Report, Application, Other",
  "category": "one of: Finance, Identity, Education, Administration, Land, Health, Legal, General",
  "subject": "subject line if present (string or null)",
  "language": "primary language: English, Marathi, Hindi, or combination like Marathi + English",
  "summary": "2-3 sentence plain English summary of what this document is about",
  "tags": ["array", "of", "relevant", "keywords"],
  "personNames": ["array of full names of people mentioned"],
  "addresses": ["array of addresses mentioned"],
  "importantDates": ["array of dates in YYYY-MM-DD format"],
  "referenceNumbers": ["array of reference/case/document numbers"],
  "emails": ["array of email addresses"],
  "phones": ["array of phone numbers"],
  "documentNumber": "primary outward/reference number (string or null)",
  "location": "primary city/district (string or null)",
  "post": "post/designation of signatory (string or null)",
  "urgencyLevel": "low, medium, high, or urgent based on content",
  "keyEntities": {"key": "value pairs of important entities like tax amounts, survey numbers, etc."}
}

OCR TEXT:
${ocrText.slice(0, 4000)}`

export async function enhanceMetadataWithAI(ocrText, ruleBasedMeta = {}) {
  if (!isAIAvailable() || !ocrText?.trim() || isConfidentialMode()) {
    return { aiEnhanced: false, ...ruleBasedMeta }
  }

  try {
    const raw = await callGemini(
      [{ text: METADATA_USER_TEMPLATE(ocrText) }],
      METADATA_SYSTEM_PROMPT
    )
    const parsed = parseJsonResponse(raw)

    if (!parsed) {
      console.warn('AI metadata parse failed, using rule-based fallback')
      return { aiEnhanced: false, ...ruleBasedMeta }
    }

    // Merge AI result with rule-based, preferring AI for most fields
    // but keeping rule-based dates/references if AI missed them
    const merged = {
      aiEnhanced: true,
      title: parsed.title || ruleBasedMeta.title || '',
      organization: parsed.organization || ruleBasedMeta.organization || '',
      documentType: parsed.documentType || ruleBasedMeta.documentType || 'Other',
      subject: parsed.subject || ruleBasedMeta.subject || '',
      language: parsed.language || ruleBasedMeta.language || 'English',
      summary: parsed.summary || '',
      tags: parsed.tags?.length ? parsed.tags : (ruleBasedMeta.tags || []),
      personNames: parsed.personNames?.length ? parsed.personNames : (ruleBasedMeta.personNames || []),
      addresses: parsed.addresses?.length ? parsed.addresses : (ruleBasedMeta.addresses || []),
      importantDates: mergeArrays(parsed.importantDates, ruleBasedMeta.importantDates),
      referenceNumbers: mergeArrays(parsed.referenceNumbers, ruleBasedMeta.referenceNumbers),
      emails: mergeArrays(parsed.emails, ruleBasedMeta.emails),
      phones: mergeArrays(parsed.phones, ruleBasedMeta.phones),
      documentNumber: parsed.documentNumber || ruleBasedMeta.documentNumber || '',
      location: parsed.location || ruleBasedMeta.location || '',
      post: parsed.post || ruleBasedMeta.post || '',
      urgencyLevel: parsed.urgencyLevel || 'medium',
      keyEntities: parsed.keyEntities || {},
      aiCategory: parsed.category || 'General',
    }

    return merged
  } catch (err) {
    console.warn('AI enhancement failed, using rule-based fallback:', err.message)
    return { aiEnhanced: false, ...ruleBasedMeta }
  }
}

function mergeArrays(ai, rule) {
  const aiArr = Array.isArray(ai) ? ai : []
  const ruleArr = Array.isArray(rule) ? rule : []
  return [...new Set([...aiArr, ...ruleArr])].filter(Boolean)
}

// ---------------------------------------------------------------------------
// AI-Powered Document Summary
// ---------------------------------------------------------------------------
export async function generateAISummary(ocrText, classification) {
  if (!isAIAvailable() || !ocrText?.trim() || isConfidentialMode()) {
    return null
  }

  try {
    const prompt = `Summarize this Indian government document OCR text in 2-3 clear, concise English sentences. 
Focus on: who issued it, to whom, about what topic, and any key action required.
Document type: ${classification?.type || 'Unknown'}

OCR TEXT (first 3000 chars):
${ocrText.slice(0, 3000)}

Return only the summary text, no JSON, no markdown.`

    const summary = await callGemini([{ text: prompt }])
    return summary?.trim() || null
  } catch (err) {
    console.warn('AI summary failed:', err.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// AI Chat with Documents
// ---------------------------------------------------------------------------
const CHAT_SYSTEM_PROMPT = `You are a helpful assistant for a government document management system called SmartDocs.
You help officers, verifiers, and citizens find information about uploaded documents.
You have access to a summary of documents in the system.
Be concise, factual, and helpful. Format your responses clearly.
If asked about specific documents, reference their title and document number.`

export async function chatWithAI(message, documentSummaries = []) {
  if (!isAIAvailable() || isConfidentialMode()) {
    return null // caller falls back to rule-based chat
  }

  try {
    const docContext = documentSummaries.slice(0, 20).map((d) =>
      `- "${d.title}" (${d.documentNumber}) | Status: ${d.status} | Dept: ${d.department} | Priority: ${d.priority} | Date: ${d.createdAt?.slice(0, 10)}`
    ).join('\n')

    const prompt = `You are helping with a government document management system. Here are some of the documents in the system:

${docContext || 'No documents available'}

User question: ${message}

Answer helpfully and concisely based on the document data above.`

    const response = await callGemini([{ text: prompt }], CHAT_SYSTEM_PROMPT)
    return response?.trim() || null
  } catch (err) {
    console.warn('AI chat failed:', err.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// AI Document Classification (when rule-based gives low confidence)
// ---------------------------------------------------------------------------
export async function classifyWithAI(ocrText) {
  if (!isAIAvailable() || !ocrText?.trim() || isConfidentialMode()) {
    return null
  }

  try {
    const prompt = `Classify this Indian government document OCR text. Return ONLY valid JSON:

{
  "type": "one of: Invoice, Aadhaar Card, Passport, Birth Certificate, Death Certificate, Marriage Certificate, Affidavit, Court Order, Land Record (7/12), Property Card, NOC, Trade License, Ration Card, Income Certificate, Caste Certificate, Domicile Certificate, FIR, University Document, Certificate, Government Order/Letter, Report, Application, Other",
  "category": "one of: Finance, Identity, Education, Administration, Land, Health, Legal, General",  
  "confidence": 0-100
}

OCR TEXT (first 1000 chars):
${ocrText.slice(0, 1000)}`

    const raw = await callGemini([{ text: prompt }])
    return parseJsonResponse(raw)
  } catch {
    return null
  }
}
