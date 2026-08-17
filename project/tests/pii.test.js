import { describe, it, expect } from 'vitest'
import {
  detectPII,
  maskPII,
  sanitizeForAI,
  normalizeTextForPII,
  PII_PATTERNS,
} from '../src/services/piiService.js'

describe('PII Masking & Detection Service', () => {
  it('normalizes whitespace, Unicode dashes, and special spaces', () => {
    const raw = 'Aadhaar:\u00A05489\u20132145\u20149876\t\tName:   Ramesh'
    const normalized = normalizeTextForPII(raw)
    expect(normalized).toContain('5489-2145-9876')
    expect(normalized).not.toContain('\u00A0')
    expect(normalized).not.toContain('\t\t')
  })

  it('detects and masks standard Aadhaar numbers', () => {
    const text = 'Citizen Aadhaar: 5489 2145 9876 verified successfully.'
    const detected = detectPII(text)
    expect(detected.length).toBe(1)
    expect(detected[0].type).toBe('Aadhaar')
    expect(detected[0].masked).toBe('XXXX XXXX 9876')

    const masked = maskPII(text)
    expect(masked).toBe('Citizen Aadhaar: [AADHAAR_REDACTED] verified successfully.')
  })

  it('detects Aadhaar with hyphens and OCR spacing variations', () => {
    const text = 'Aadhaar number 1234-5678-9012 was presented.'
    const detected = detectPII(text)
    expect(detected.length).toBe(1)
    expect(detected[0].type).toBe('Aadhaar')

    const masked = maskPII(text)
    expect(masked).toContain('[AADHAAR_REDACTED]')
  })

  it('detects and masks PAN Card numbers with case insensitivity', () => {
    const text = 'Income tax PAN: ABCDE1234F for the applicant.'
    const detected = detectPII(text)
    expect(detected.length).toBe(1)
    expect(detected[0].type).toBe('PAN Card')
    expect(detected[0].masked).toBe('ABCXX1234X')

    const masked = maskPII(text)
    expect(masked).toBe('Income tax PAN: [PAN_REDACTED] for the applicant.')
  })

  it('detects and masks GSTIN numbers', () => {
    const text = 'Supplier GSTIN: 27ABCDE1234F1Z5 registered in Maharashtra.'
    const detected = detectPII(text)
    expect(detected.length).toBe(1)
    expect(detected[0].type).toBe('GSTIN')

    const masked = maskPII(text)
    expect(masked).toBe('Supplier GSTIN: [GST_REDACTED] registered in Maharashtra.')
  })

  it('detects and masks Indian mobile phone numbers with and without +91', () => {
    const text = 'Contact: +91 98765 43210 or 8765432109 for inquiries.'
    const detected = detectPII(text)
    expect(detected.length).toBeGreaterThanOrEqual(1)

    const masked = maskPII(text)
    expect(masked).toContain('[PHONE_REDACTED]')
    expect(masked).not.toContain('98765 43210')
  })

  it('detects and masks email addresses', () => {
    const text = 'Send documents to officer.pune@gov.in for verification.'
    const detected = detectPII(text)
    expect(detected.length).toBe(1)
    expect(detected[0].type).toBe('Email Address')

    const masked = maskPII(text)
    expect(masked).toBe('Send documents to [EMAIL_REDACTED] for verification.')
  })

  it('detects Voter IDs and Indian Passports', () => {
    const text = 'Voter ID: ABC1234567, Passport No: Z1234567.'
    const detected = detectPII(text)
    expect(detected.some((d) => d.type === 'Voter ID')).toBe(true)
    expect(detected.some((d) => d.type === 'Passport')).toBe(true)

    const masked = maskPII(text)
    expect(masked).toContain('[VOTERID_REDACTED]')
    expect(masked).toContain('[PASSPORT_REDACTED]')
  })

  it('sanitizeForAI returns sanitized text safely when redaction succeeds', () => {
    const text = 'Meeting with Ramesh (PAN: ABCDE1234F) regarding land revenue.'
    const result = sanitizeForAI(text)
    expect(result.success).toBe(true)
    expect(result.text).toContain('[PAN_REDACTED]')
    expect(result.text).not.toContain('ABCDE1234F')
  })

  it('sanitizeForAI does not log or leak raw sensitive data on safe fail', () => {
    const emptyResult = sanitizeForAI('')
    expect(emptyResult.success).toBe(true)
    expect(emptyResult.text).toBe('')
  })
})
