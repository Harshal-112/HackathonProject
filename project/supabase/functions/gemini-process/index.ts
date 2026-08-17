// ---------------------------------------------------------------------------
// Supabase Edge Function: gemini-process
//
// Secure server-side proxy for Google Gemini API.
// Keeps GEMINI_API_KEY strictly on the server and enforces:
//  - Authenticated requests (JWT verification)
//  - Server-side rate limiting per user
//  - Server-side PII validation before dispatching to LLM
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// In-memory rate limiting map: userId -> timestamps array
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_MAX_RPM = 15 // 15 requests per minute

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // 1. Verify user authentication via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid authentication token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Rate limiting per user
    const now = Date.now()
    const userTimestamps = rateLimitMap.get(user.id) || []
    const recentTimestamps = userTimestamps.filter((t) => now - t < 60000)

    if (recentTimestamps.length >= RATE_LIMIT_MAX_RPM) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute before making more AI requests.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    recentTimestamps.push(now)
    rateLimitMap.set(user.id, recentTimestamps)

    // 3. Verify server-side Gemini API key configuration
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parse request payload
    const { parts, systemInstruction, model } = await req.json()
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: parts array is required.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Server-side PII check (ensure sensitive identifiers were redacted)
    for (const part of parts) {
      if (part.text) {
        const rawText = part.text
        // Basic check for unmasked 12-digit Aadhaar pattern
        if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(rawText)) {
          return new Response(
            JSON.stringify({ error: 'Security validation failed: Unredacted sensitive identifier detected.' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // 6. Forward to Google Gemini API
    const targetModel = model || 'gemini-1.5-flash'
    const url = `${GEMINI_BASE}/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      const msg = err?.error?.message || geminiRes.statusText
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${geminiRes.status}: ${msg}` }),
        { status: geminiRes.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiRes.json()
    const outputText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return new Response(
      JSON.stringify({ text: outputText }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
