// ---------------------------------------------------------------------------
// documentClassifier.js — Rule-Based Document Classification
//
// Classifies document text using weighted keyword & pattern matching.
// Features:
//   - 20+ Indian & Maharashtra state government document types
//   - Bilingual pattern matching (English + Marathi Devanagari)
//   - Word-boundary awareness to prevent substring false-positives
//   - Disambiguates Government Orders/Resolutions (GRs) and Corrigendums
//     from Court Orders and Affidavits
// ---------------------------------------------------------------------------

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Helper to check if keyword exists as whole-word for short acronyms or substring for multi-word phrases
function matchKeywordInText(text, keyword) {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return false

  // If keyword is short English acronym (<=4 chars, e.g. "sc", "st", "pan", "rto", "fir", "noc", "gst", "rc", "gr", "obc", "ews", "lbt")
  if (/^[a-z0-9\-\/]{1,4}$/i.test(kw)) {
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}($|[^a-zA-Z0-9])`, 'i')
    return regex.test(text)
  }

  // Otherwise standard substring match
  return text.includes(kw)
}

export const DOC_TYPES = [
  {
    type: 'Invoice',
    category: 'Finance',
    keywords: [
      'tax invoice', 'commercial invoice', 'bill of supply', 'gstin', 'invoice',
      'पावती', 'देयक', 'कर पावती', 'मालमत्ता कर', 'property tax', 'water tax',
      'audit report', 'audit inspection', 'bank guarantee', 'performance guarantee',
      'bill of', 'बिल रक्कम', 'igst', 'cgst', 'sgst', 'gst', 'e-challan', 'challan',
      'stamp duty', 'gras', 'lbt', 'local body tax', 'assessment order'
    ],
    weight: 3,
  },
  {
    type: 'Aadhaar Card',
    category: 'Identity',
    keywords: ['aadhaar', 'aadhar', 'unique identification authority', 'uidai', 'आधार', 'आधार कार्ड', 'विशिष्ट ओळख', 'mera aadhaar', 'pm-jay', 'ayushman bharat'],
    weight: 5,
  },
  {
    type: 'Passport',
    category: 'Identity',
    keywords: ['passport', 'republic of india', 'ministry of external affairs', 'पारपत्र', 'विदेश मंत्रालय'],
    weight: 5,
  },
  {
    type: 'PAN Card',
    category: 'Identity',
    keywords: ['permanent account number', 'income tax department', 'pan card', 'कायमस्वरूपी खाते क्रमांक', 'कायमस्वरूपी खाते', 'pan'],
    weight: 5,
  },
  {
    type: 'Ration Card',
    category: 'Identity',
    keywords: [
      'ration card', 'ration shop', 'food distribution', 'public distribution',
      'रेशन कार्ड', 'शिधापत्रिका', 'अन्न व नागरी पुरवठा', 'स्वस्त धान्य दुकान',
      'senior citizen', 'ज्येष्ठ नागरिक', 'e-shram', 'ई-श्रम', 'unorganised workers'
    ],
    weight: 4,
  },
  {
    type: 'Voter ID',
    category: 'Identity',
    keywords: ['elector photo identity', 'voter id', 'epic no', 'electoral photo', 'मतदार ओळखपत्र', 'मतदार यादी', 'voter list'],
    weight: 5,
  },
  {
    type: 'Driving Licence',
    category: 'License',
    keywords: [
      'driving licence', 'driving license', 'learner licence', 'learner license',
      'motor vehicles department', 'certificate of registration', 'chassis no',
      'वाहन चालक परवाना', 'चालक परवाना', 'मोटार वाहन', 'rto', 'dl-'
    ],
    weight: 4,
  },
  {
    type: 'Birth Certificate',
    category: 'Legal',
    keywords: ['birth certificate', 'date of birth', 'place of birth', 'जन्म प्रमाणपत्र', 'जन्म दाखला', 'जन्मतारीख', 'registration of births'],
    weight: 5,
  },
  {
    type: 'Death Certificate',
    category: 'Legal',
    keywords: ['death certificate', 'date of death', 'cause of death', 'मृत्यू प्रमाणपत्र', 'मृत्यू दाखला', 'मृत्यू नोंदणी'],
    weight: 5,
  },
  {
    type: 'Marriage Certificate',
    category: 'Legal',
    keywords: ['marriage certificate', 'marriage registration', 'विवाह नोंदणी', 'विवाह प्रमाणपत्र', 'लग्न नोंदणी', 'memorandum of marriage'],
    weight: 5,
  },
  {
    type: 'Caste Certificate',
    category: 'Certificate',
    keywords: [
      'caste certificate', 'caste validity', 'caste validation', 'caste scrutiny',
      'other backward class', 'scheduled caste', 'scheduled tribe', 'non-creamy layer',
      'जात प्रमाणपत्र', 'जात पडताळणी', 'जात वैधता', 'जात दाखला', 'कुणबी', 'obc', 'sc', 'st', 'nt', 'vjnt',
      'udid', 'disability certificate', 'अपंगत्व प्रमाणपत्र', 'orphan certificate', 'anath', 'अनाथ प्रमाणपत्र',
      'economically weaker', 'ews'
    ],
    weight: 4,
  },
  {
    type: 'Income Certificate',
    category: 'Certificate',
    keywords: ['income certificate', 'annual income', 'उत्पन्न प्रमाणपत्र', 'वार्षिक उत्पन्न', 'solvency certificate', 'solvency'],
    weight: 4,
  },
  {
    type: 'Domicile Certificate',
    category: 'Certificate',
    keywords: ['domicile certificate', 'nationality certificate', 'residence certificate', 'रहिवाशी प्रमाणपत्र', 'अधिवास', 'domicile', 'freedom fighter', 'swatantrata sainik'],
    weight: 4,
  },
  {
    type: 'Affidavit',
    category: 'Legal',
    keywords: [
      'affidavit', 'notary', 'notarized', 'sworn before', 'solemn affirmation',
      'प्रतिज्ञापत्र', 'शपथपत्र', 'power of attorney', 'कुलमुखत्यारपत्र', 'waras certificate', 'वारस'
    ],
    weight: 4,
  },
  {
    type: 'Court Order',
    category: 'Legal',
    keywords: [
      'high court', 'district court', 'district judge', 'supreme court', 'writ petition',
      'civil suit', 'injunction order', 'judgment', 'judgement', 'petitioner', 'respondent',
      'consumer disputes', 'lok adalat', 'anticipatory bail', 'न्यायालय', 'मा. न्यायालय', 'कोर्ट', 'याचिका'
    ],
    weight: 4,
  },
  {
    type: 'Government Order/Letter',
    category: 'Administration',
    keywords: [
      'शासन निर्णय', 'शुद्धिपत्रक', 'शुद्धीपत्रक', 'परिपत्रक', 'government resolution',
      'government order', 'corrigendum', 'circular', 'अधिसूचना', 'gazette notification',
      'आपत्ती व्यवस्थापन', 'बदल्या व पदस्थापना', 'ग्रामसभा ठराव', 'ठराव क्रमांक', 'budget allocation',
      'sanction order', 'grant order', 'pm kisan', 'soil health card', 'मंजुरी', 'जलसंपदा', 'धरण विसर्ग',
      'pollution control', 'consent to operate', 'election commission', 'dcr', 'udcpr', 'पोषण आहार'
    ],
    weight: 4,
  },
  {
    type: 'Land Record (7/12)',
    category: 'Land',
    keywords: [
      '7/12', 'satbara', '७/१२', 'सातबारा', 'गाव नमुना सात', 'गाव नमुना आठ', '८ अ', '८-अ',
      'फेरफार', 'अधिकार अभिलेख', 'survey number', 'gat number', 'khasra', 'खसरा',
      'गट क्रमांक', 'गट नंबर', 'भूमापन क्रमांक', 'खाते क्रमांक', 'भोगवटदार', 'non-agricultural',
      'land acquisition', 'land record', 'talathi', 'तलाठी', 'पंचनामा', 'वाटप पत्र', 'ई-पीक पाहणी',
      'पीक पाहणी', 'गायरान', 'अतिक्रमण', 'title search', 'land valuation', 'kisan credit card'
    ],
    weight: 5,
  },
  {
    type: 'Property Card',
    category: 'Land',
    keywords: ['property card', 'city survey', 'city survey number', 'मालमत्ता पत्रक', 'शहर सर्व्हे', 'gaothan sanad', 'सनद'],
    weight: 5,
  },
  {
    type: 'NOC',
    category: 'Certificate',
    keywords: [
      'no objection certificate', 'noc', 'no objection', 'ना हरकत प्रमाणपत्र', 'ना हरकत',
      'हरकत नाही', 'commencement certificate', 'building permission', 'character verification',
      'police verification report'
    ],
    weight: 4,
  },
  {
    type: 'Trade License',
    category: 'License',
    keywords: ['trade license', 'shop license', 'shop establishment', 'gumasta', 'गुमास्ता', 'व्यापार परवाना', 'दुकान परवाना'],
    weight: 4,
  },
  {
    type: 'FIR',
    category: 'Legal',
    keywords: ['first information report', 'fir', 'police station', 'section 154', 'section 155', 'non cognizable', 'प्रथम सूचना अहवाल', 'पोलिस ठाणे', 'lost document'],
    weight: 5,
  },
  {
    type: 'University Document',
    category: 'Education',
    keywords: [
      'university', 'college', 'semester', 'degree', 'marksheet', 'passing certificate',
      'school leaving certificate', 'transfer certificate', 'statement of marks', 'scholarship',
      'mahadbt', 'ssc examination', 'hsc examination', 'pavitra portal', 'migration certificate',
      'apprenticeship certificate', 'ph.d.', 'viva voce', 'विद्यापीठ', 'महाविद्यालय',
      'गुणपत्रिका', 'शाळा सोडल्याचा दाखला', 'शिक्षक भरती'
    ],
    weight: 4,
  },
]

export function classifyDocument(text) {
  if (!text || typeof text !== 'string') {
    return {
      type: 'Other',
      category: 'General',
      confidence: 30,
      matchedKeywords: 0,
    }
  }

  const t = text.toLowerCase()
  let bestMatch = null
  let bestScore = 0

  for (const docType of DOC_TYPES) {
    let score = 0
    let matchCount = 0

    for (const keyword of docType.keywords) {
      if (matchKeywordInText(t, keyword)) {
        score += docType.weight
        matchCount++
      }
    }

    if (score > bestScore) {
      bestScore = score
      // Compute realistic confidence based on match density and type weight
      const rawConfidence = Math.round((matchCount / Math.min(docType.keywords.length, 4)) * 85 + (docType.weight * 3))
      bestMatch = {
        type: docType.type,
        category: docType.category,
        confidence: Math.min(96, Math.max(35, rawConfidence)),
        matchedKeywords: matchCount,
      }
    }
  }

  return bestMatch || {
    type: 'Other',
    category: 'General',
    confidence: 35,
    matchedKeywords: 0,
  }
}