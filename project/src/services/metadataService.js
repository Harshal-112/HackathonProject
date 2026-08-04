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

  // Prefer an actual subject line if the document has one — that's a much
  // more reliable "title" than guessing from the first plausible-looking line.
  const subjectMatch = text.match(/(?:Subject|विषय)\s*[:：]?\s*[-–]?\s*(.+)/i)
  if (subjectMatch && subjectMatch[1].trim().length >= 8) {
    return subjectMatch[1].trim()
  }

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

    // Skip lines that are really just an email address, a URL, or a bare
    // reference/outward number — these were being picked up as "titles"
    // when they were the only long-enough line before real content.
    if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(line)) continue;
    if (/https?:\/\/|www\.|\.(com|in|org|net)\b/i.test(line)) continue;
    if (/^(जा\.?\s*क्र\.?|जावक|outward|reference)/i.test(line)) continue;

    return line;
  }

  return "";
}

export function extractOrganization(text) {

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const knownNames = [
    /Savitribai Phule Pune University/i,
    /University of Pune/i,
    /Government of Maharashtra/i,
    /Maharashtra Public Service Commission/i,
    /Income Tax Department/i,
    /Reserve Bank of India/i,
    /State Bank of India/i
  ];

  for (const line of lines) {
    for (const pattern of knownNames) {
      if (pattern.test(line)) return line;
    }
  }

  // Fallback: known names only cover 7 specific organizations. Most
  // documents this app handles are from generic government offices
  // (Gram Panchayat, Tehsil, Collector's office, etc.) that will never
  // match a fixed whitelist. Instead, look for a line containing a common
  // office/department keyword in Marathi, Hindi, or English.
  const officeKeywords = /(कार्यालय|विभाग|पंचायत|महाविद्यालय|विद्यापीठ|तहसील|जिल्हा परिषद|महालेखापाल|शासन|सरकार|office|department|collector|university|college)/i
  for (const line of lines) {
    if (officeKeywords.test(line) && line.length >= 5 && line.length <= 120) {
      return line
    }
  }

  return "";
}

export function extractSubject(text) {

  // English "Subject:" plus Marathi/Hindi equivalents (विषय / विषयः).
  const match = text.match(/(?:Subject|विषय)\s*[:：]?\s*[-–]?\s*(.+)/i);

  if (match) {
    return match[1].trim();
  }

  return "";
}

export function extractPost(text) {

  // English "Post:" plus Marathi "पद" (post/designation).
  const match = text.match(/(?:Post|पद)\s*[:：]?\s*(.+)/i);

  if (match) {
    return match[1].trim();
  }

  return "";
}

export function extractDocumentNumber(text) {

  // English "Outward No." plus common Marathi/Hindi reference-number
  // labels: जा.क्र. / जावक क्रमांक (outward no.), क्रमांक (number).
  const patterns = [
    /Outward\s*No\.?\s*:\s*([A-Za-z]{1,5}\s*\/\s*\d+)/i,
    /(?:जा\.?\s*क्र\.?|जावक\s*क्रमांक|क्रमांक)\s*[:：]?\s*([A-Za-z0-9\u0900-\u097F\/\-]{2,30})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, "");
  }

  return "";
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
