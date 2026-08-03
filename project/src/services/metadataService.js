const DEVANAGARI_REGEX = /[\u0900-\u097F]/g
const DATE_REGEX = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g
const LOCATION_HINTS = ['Pune', 'Nashik', 'Nagpur', 'Kolhapur', 'Aurangabad', 'Mumbai', 'Ganeshkhind']
const EMAIL_REGEX =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const PHONE_REGEX =
  /\b(?:\+91[- ]?)?[6-9]\d{9}\b/g;

const REFERENCE_REGEX =
  /\b[A-Z]{1,5}[-\/]?\d{2,10}\b/g;

export function detectLanguage(text) {

  const devanagariChars =
    text.match(/[\u0900-\u097F]/g) || [];

  const englishChars =
    text.match(/[A-Za-z]/g) || [];

  console.log("Devanagari:", devanagariChars.length);
  console.log("English:", englishChars.length);

  if (
      devanagariChars.length > 20 &&
      englishChars.length > 20
  ) {
      return "Marathi + English";
  }

  if (devanagariChars.length > englishChars.length) {
      return "Marathi";
  }

  if (englishChars.length > devanagariChars.length) {
      return "English";
  }

  return "Mixed";
}

export function extractDates(text) {
  const currentYear = new Date().getFullYear()
  return [...text.matchAll(DATE_REGEX)].map(([raw, d, m, y]) => {
    const year = parseInt(y, 10)
    const month = parseInt(m, 10)
    const day = parseInt(d, 10)
    const plausible = year >= currentYear - 10 && year <= currentYear + 2
      && month >= 1 && month <= 12 && day >= 1 && day <= 31
    const iso = plausible
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : null
    return { raw, iso, flaggedForReview: !plausible }
  })
}

export function extractLocations(text) {
  return LOCATION_HINTS.filter((loc) => text.includes(loc))
}

export function extractEmails(text) {
  return [...new Set(text.match(EMAIL_REGEX) || [])];
}

export function extractPhones(text) {
  return [...new Set(text.match(PHONE_REGEX) || [])];
}

export function extractReferenceNumbers(text) {
  return [...new Set(text.match(REFERENCE_REGEX) || [])];
}

export function extractTitle(text) {

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  for (let line of lines) {

    line = line.replace(/^[^A-Za-z\u0900-\u097F]+/, "");

    line = line.replace(/^i\s+/i, "");

    line = line.replace(/^l\s+/i, "");

    if (
      line.length < 15 ||
      line.length > 120
    ) continue;

    if (/page\s+\d/i.test(line)) continue;

    if (/date/i.test(line)) continue;

    if (/email/i.test(line)) continue;

    return line;
  }

  return "";
}

export function extractOrganization(text) {

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const patterns = [
    /Savitribai Phule Pune University/i,
    /University of Pune/i,
    /Government of Maharashtra/i,
    /Maharashtra Public Service Commission/i,
    /Income Tax Department/i,
    /Reserve Bank of India/i,
    /State Bank of India/i
  ];

  for (const line of lines) {

    for (const pattern of patterns) {

      if (pattern.test(line)) {
        return line;
      }

    }

  }

  return "";
}

export function extractSubject(text) {

  const match = text.match(/Subject\s*:\s*(.+)/i);

  if (match) {
    return match[1].trim();
  }

  return "";
}

export function extractPost(text) {

  const match = text.match(/Post\s*:\s*(.+)/i);

  if (match) {
    return match[1].trim();
  }

  return "";
}

export function extractDocumentNumber(text) {

  const match = text.match(
    /Outward\s*No\.?\s*:\s*([A-Za-z]{1,5}\s*\/\s*\d+)/i
  );

  if (!match) {
    return "";
  }

  return match[1].replace(/\s+/g, "");
}

export function generateMetadata(fullText) {
  const dates = extractDates(fullText)
  const locations = extractLocations(fullText)
  const title = extractTitle(fullText)
  const organization = extractOrganization(fullText)
  const subject = extractSubject(fullText)
  const post = extractPost(fullText)
  const documentNumber = extractDocumentNumber(fullText);
  return {
    title,
    organization,
    subject,
    post,
    documentNumber,
    language: detectLanguage(fullText),

    importantDates: dates
      .filter((d) => d.iso)
      .map((d) => d.iso),

    flaggedDates: dates
      .filter((d) => d.flaggedForReview)
      .map((d) => d.raw),

    location: locations[0] || null,

    locations,

    emails: extractEmails(fullText),

    phones: extractPhones(fullText),

    referenceNumbers:
        extractReferenceNumbers(fullText),
  }
}
