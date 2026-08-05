// ---------------------------------------------------------------------------
// documentClassifier.js — Enhanced document classification
//
// Improvements:
//   1. 15+ document types (previously 6)
//   2. Real confidence scoring based on keyword match count
//   3. Multi-keyword scoring — picks highest scoring type
//   4. Bilingual keywords (English + Marathi/Hindi) for all types
// ---------------------------------------------------------------------------

const DOC_TYPES = [
  {
    type: 'Invoice',
    category: 'Finance',
    keywords: ['invoice', 'gst', 'tax invoice', 'bill of supply', 'gstin', 'पावती', 'बिल', 'देयक', 'igst', 'cgst', 'sgst'],
    weight: 3,
  },
  {
    type: 'Aadhaar Card',
    category: 'Identity',
    keywords: ['aadhaar', 'aadhar', 'unique identification authority', 'uidai', 'आधार', 'आधार कार्ड', 'विशिष्ट ओळख'],
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
    keywords: ['permanent account number', 'income tax department', 'pan card', 'कायमस्वरूपी खाते क्रमांक'],
    weight: 4,
  },
  {
    type: 'Ration Card',
    category: 'Identity',
    keywords: ['ration card', 'food distribution', 'public distribution', 'ration shop', 'रेशन कार्ड', 'अन्न वितरण'],
    weight: 4,
  },
  {
    type: 'Voter ID',
    category: 'Identity',
    keywords: ['voter', 'election commission', 'electoral', 'elector', 'निवडणूक', 'मतदार', 'मतदार ओळखपत्र'],
    weight: 4,
  },
  {
    type: 'Driving Licence',
    category: 'License',
    keywords: ['driving licence', 'driving license', 'rto', 'motor vehicles', 'dl-', 'वाहन चालक परवाना', 'वाहतूक'],
    weight: 4,
  },
  {
    type: 'Birth Certificate',
    category: 'Legal',
    keywords: ['birth certificate', 'date of birth', 'place of birth', 'जन्म प्रमाणपत्र', 'जन्म दाखला', 'जन्मतारीख'],
    weight: 4,
  },
  {
    type: 'Death Certificate',
    category: 'Legal',
    keywords: ['death certificate', 'date of death', 'cause of death', 'मृत्यू प्रमाणपत्र', 'मृत्यू दाखला'],
    weight: 4,
  },
  {
    type: 'Marriage Certificate',
    category: 'Legal',
    keywords: ['marriage certificate', 'marriage registration', 'married', 'विवाह नोंदणी', 'विवाह प्रमाणपत्र', 'लग्न'],
    weight: 4,
  },
  {
    type: 'Caste Certificate',
    category: 'Certificate',
    keywords: ['caste certificate', 'caste validity', 'obc', 'sc', 'st', 'nt', 'vjnt', 'जात प्रमाणपत्र', 'जात पडताळणी', 'जात वैधता'],
    weight: 4,
  },
  {
    type: 'Income Certificate',
    category: 'Certificate',
    keywords: ['income certificate', 'annual income', 'उत्पन्न प्रमाणपत्र', 'वार्षिक उत्पन्न'],
    weight: 4,
  },
  {
    type: 'Domicile Certificate',
    category: 'Certificate',
    keywords: ['domicile', 'residence certificate', 'domicile certificate', 'रहिवाशी प्रमाणपत्र', 'अधिवास'],
    weight: 4,
  },
  {
    type: 'Affidavit',
    category: 'Legal',
    keywords: ['affidavit', 'notary', 'notarized', 'sworn before', 'solemn affirmation', 'प्रतिज्ञापत्र', 'शपथपत्र'],
    weight: 4,
  },
  {
    type: 'Court Order',
    category: 'Legal',
    keywords: ['court', 'high court', 'district court', 'order', 'judgment', 'petitioner', 'respondent', 'न्यायालय', 'आदेश', 'निर्णय'],
    weight: 3,
  },
  {
    type: 'Land Record (7/12)',
    category: 'Land',
    keywords: ['7/12', 'satbara', 'survey number', 'gat number', 'khasra', 'खाते', 'सातबारा', 'सर्व्हे नंबर', 'गट नंबर', 'भूधारण'],
    weight: 5,
  },
  {
    type: 'Property Card',
    category: 'Land',
    keywords: ['property card', 'city survey', 'city survey number', 'मालमत्ता पत्रक', 'शहर सर्व्हे'],
    weight: 4,
  },
  {
    type: 'NOC',
    category: 'Certificate',
    keywords: ['no objection certificate', 'noc', 'no objection', 'अहरकार नाही प्रमाणपत्र', 'ना हरकत', 'हरकत नाही'],
    weight: 4,
  },
  {
    type: 'Trade License',
    category: 'License',
    keywords: ['trade license', 'shop license', 'shop establishment', 'व्यापार परवाना', 'दुकान परवाना'],
    weight: 4,
  },
  {
    type: 'FIR',
    category: 'Legal',
    keywords: ['first information report', 'fir', 'police station', 'complaint', 'accused', 'complainant', 'प्रथम सूचना अहवाल', 'पोलिस ठाणे'],
    weight: 5,
  },
  {
    type: 'University Document',
    category: 'Education',
    keywords: ['university', 'college', 'semester', 'degree', 'marksheet', 'result', 'विद्यापीठ', 'महाविद्यालय', 'गुणपत्रिका', 'परीक्षा'],
    weight: 3,
  },
  {
    type: 'Government Order/Letter',
    category: 'Administration',
    keywords: ['government of maharashtra', 'शासन', 'सरकार', 'जिल्हा परिषद', 'ग्रामपंचायत', 'पंचायत', 'तहसील', 'महालेखापाल', 'कार्यालय', 'विभाग', 'government order', 'circular', 'परिपत्रक'],
    weight: 2,
  },
]

export function classifyDocument(text) {
  const t = text.toLowerCase()
  let bestMatch = null
  let bestScore = 0

  for (const docType of DOC_TYPES) {
    let score = 0
    let matchCount = 0

    for (const keyword of docType.keywords) {
      if (t.includes(keyword)) {
        score += docType.weight
        matchCount++
      }
    }

    if (score > bestScore) {
      bestScore = score
      // Compute real confidence: (matchCount / total keywords) * 100, capped realistically
      const rawConfidence = Math.round((matchCount / Math.min(docType.keywords.length, 5)) * 100)
      bestMatch = {
        type: docType.type,
        category: docType.category,
        confidence: Math.min(98, Math.max(50, rawConfidence)),
        matchedKeywords: matchCount,
      }
    }
  }

  return bestMatch || {
    type: 'Other',
    category: 'General',
    confidence: 40,
    matchedKeywords: 0,
  }
}