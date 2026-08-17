// ---------------------------------------------------------------------------
// aiService.js
//
// AI-assisted document analysis using secure server-side processing.
// The Gemini API key is NEVER exposed in the frontend; all requests are routed
// through an authenticated Supabase Edge Function with server-side rate
// limiting and pre-flight PII sanitization.
//
// Falls back gracefully to rule-based extraction when:
//   - Backend AI service is not deployed / offline
//   - Confidential Mode is active (user toggled it ON)
//   - Rate limit is exceeded
//   - Unmaskable sensitive data is detected (safety fail-soft)
// ---------------------------------------------------------------------------

import { supabase } from '../lib/supabase.js'
import { sanitizeForAI, maskPII } from './piiService.js'

export { maskPII }

/**
 * Checks if the backend AI integration is accessible.
 */
export function isAIAvailable() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  return Boolean(supabaseUrl && supabaseUrl.trim() !== '')
}

/**
 * Check if Confidential Mode is active.
 */
export function isConfidentialMode() {
  try {
    return localStorage.getItem('sdds_confidential_mode') === 'true'
  } catch {
    return false
  }
}

/**
 * Invokes the secure server-side Gemini Edge Function.
 * Sanitizes all text parts with PII masking before dispatching.
 */
async function callGemini(parts, systemInstruction = '') {
  if (isConfidentialMode()) {
    throw new Error('Confidential Mode is active. Cloud AI calls are disabled.')
  }

  // 1. Pre-flight PII sanitization across all text parts
  const safeParts = []
  for (const part of parts) {
    if (part.text) {
      const sanitized = sanitizeForAI(part.text)
      if (!sanitized.success) {
        // Redaction could not be guaranteed — skip AI processing safely
        throw new Error(sanitized.error || 'Sensitive information could not be safely redacted. AI processing was skipped.')
      }
      safeParts.push({ ...part, text: sanitized.text })
    } else {
      safeParts.push(part)
    }
  }

  // 2. Invoke server-side Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('gemini-process', {
      body: {
        parts: safeParts,
        systemInstruction,
        model: 'gemini-1.5-flash',
      },
    })

    if (error) {
      throw new Error(error.message || 'AI backend invocation failed')
    }

    if (data?.text) {
      return data.text
    }

    throw new Error('Empty response from AI service')
  } catch (err) {
    // Log safe error without any PII
    console.warn('[AI Service] Secure Edge Function call notice:', err.message)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Parse JSON from LLM (robust with fallback sanitization)
// ---------------------------------------------------------------------------
function parseJsonResponse(raw) {
  if (!raw) return null

  let cleaned = raw.trim()
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim()
  }

  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    cleaned = jsonObjectMatch[0].trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch (_) {
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1')
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
// MAIN: Enhance OCR-extracted metadata with AI
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
      return { aiEnhanced: false, ...ruleBasedMeta }
    }

    return {
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
  } catch (err) {
    console.warn('AI enhancement notice (using rule-based metadata):', err.message)
    return { aiEnhanced: false, ...ruleBasedMeta }
  }
}

function mergeArrays(ai, rule) {
  const aiArr = Array.isArray(ai) ? ai : []
  const ruleArr = Array.isArray(rule) ? rule : []
  return [...new Set([...aiArr, ...ruleArr])].filter(Boolean)
}

// ---------------------------------------------------------------------------
// AI-Assisted Document Summary
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
    console.warn('AI summary notice:', err.message)
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
    return null
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
    console.warn('AI chat notice:', err.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// AI Document Classification (used for model comparison / agreement analysis)
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

// ---------------------------------------------------------------------------
// AI-Assisted Smart Search (Semantic Document Matching)
// ---------------------------------------------------------------------------
export async function aiSearchDocuments(query, docs = []) {
  if (!isAIAvailable() || !query?.trim() || isConfidentialMode() || docs.length === 0) {
    return null
  }

  try {
    const compactDocs = docs.map((d) => ({
      id: d.id,
      title: d.title,
      docNo: d.documentNumber,
      status: d.status,
      priority: d.priority,
      dept: d.department,
      cat: d.category,
      summary: d.metadata?.summary || '',
      tags: (d.metadata?.tags || []).join(', '),
      ocrSnippet: (d.ocrText || '').slice(0, 300),
    }))

    const prompt = `You are a search matching engine for a government document repository.
Search Query: "${query}"

DOCUMENTS LIST:
${JSON.stringify(compactDocs, null, 2)}

Task:
Analyze the search query and match it against document titles, document numbers, departments, categories, priorities, statuses, AI summaries, tags, and OCR text snippets.
Understand natural language concepts (e.g. "urgent land files", "recruitment notices", "pending approvals in Revenue", "documents from last week").

Return ONLY valid JSON in this exact format with NO markdown wrapper:
{
  "matchingIds": ["id1", "id2"]
}

If no documents match, return {"matchingIds": []}. Order the IDs from highest relevance to lowest.`

    const raw = await callGemini([{ text: prompt }])
    const parsed = parseJsonResponse(raw)
    return Array.isArray(parsed?.matchingIds) ? parsed.matchingIds : null
  } catch (err) {
    console.warn('[AI Search] Search parsing notice:', err.message)
    return null
  }
}
