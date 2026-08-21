// ---------------------------------------------------------------------------
// Supabase Edge Function: gemini-process
//
// Secure, high-speed server-side proxy for Google Gemini API.
// Keeps GEMINI_API_KEY strictly on the server and enforces:
//  - Priority ranking: gemini-3.1-flash-lite -> gemini-flash-lite-latest -> gemini-3.7-flash -> gemini-2.5-flash -> gemini-2.5-flash-lite
//  - Fast failover with 12-second timeout per model
//  - CORS headers for browser requests
//  - Pre-flight PII safety validation before dispatching to LLM
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Ranked active models in requested priority order
const AI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

// In-memory rate limiting map: callerId -> timestamps array
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX_RPM = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  // Diagnostic model listing support
  if (req.method === 'GET') {
    try {
      const listRes = await fetch(`${GEMINI_BASE}/models?key=${GEMINI_API_KEY}`)
      const listData = await listRes.json()
      return new Response(JSON.stringify(listData), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS_HEADERS })
    }
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 2. Identify caller and apply rate limiting
    const authHeader = req.headers.get('Authorization') || ''
    const callerId = req.headers.get('x-forwarded-for') || authHeader.slice(-16) || 'anonymous'

    const now = Date.now()
    const callerTimestamps = rateLimitMap.get(callerId) || []
    const recentTimestamps = callerTimestamps.filter((t) => now - t < 60000)

    if (recentTimestamps.length >= RATE_LIMIT_MAX_RPM) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    recentTimestamps.push(now)
    rateLimitMap.set(callerId, recentTimestamps)

    // 3. Verify server-side Gemini API key configuration
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
      console.error('[gemini-process] GEMINI_API_KEY secret is not set in Supabase project.')
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured on Supabase.' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parse request body
    const bodyText = await req.text()
    if (!bodyText) {
      return new Response(
        JSON.stringify({ error: 'Request body cannot be empty.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { parts, systemInstruction, model } = JSON.parse(bodyText)
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: parts array is required.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Server-side PII safeguard check
    for (const part of parts) {
      if (part.text && /\b\d{4}\s\d{4}\s\d{4}\b/.test(part.text)) {
        return new Response(
          JSON.stringify({ error: 'Security validation failed: Unredacted sensitive identifier detected.' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 6. Target models: try caller's requested model first, then ranked fallback models
    const targetModels = model
      ? [model, ...AI_MODELS.filter((m) => m !== model)]
      : AI_MODELS

    let lastErrorMsg = 'All AI models failed'

    const geminiPayload: Record<string, unknown> = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 1024,
      },
    }

    if (systemInstruction) {
      geminiPayload.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    for (const m of targetModels) {
      const url = `${GEMINI_BASE}/models/${m}:generateContent?key=${GEMINI_API_KEY}`
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 12000)

        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (geminiRes.ok) {
          const data = await geminiRes.json()
          const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (outputText) {
            return new Response(
              JSON.stringify({ text: outputText, modelUsed: m }),
              { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            )
          }
        }

        const errBody = await geminiRes.json().catch(() => ({}))
        lastErrorMsg = errBody?.error?.message || geminiRes.statusText || `HTTP ${geminiRes.status}`
        console.warn(`[gemini-process] Model ${m} returned ${geminiRes.status}: ${lastErrorMsg}, trying next fallback...`)
      } catch (err: any) {
        lastErrorMsg = err.name === 'AbortError' ? `Model ${m} timed out (>12s)` : err.message
        console.warn(`[gemini-process] Error on ${m}: ${lastErrorMsg}`)
      }
    }

    return new Response(
      JSON.stringify({ error: lastErrorMsg }),
      { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
