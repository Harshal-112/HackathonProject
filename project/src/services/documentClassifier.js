export function classifyDocument(text) {

    const t = text.toLowerCase();

    if (
        t.includes("invoice") ||
        t.includes("gst") ||
        t.includes("tax invoice") ||
        t.includes("पावती") ||
        t.includes("बिल") ||
        t.includes("देयक")
    ) {
        return {
            type: "Invoice",
            category: "Finance",
            confidence: 95
        };
    }

    if (
        t.includes("aadhaar") ||
        t.includes("unique identification authority") ||
        t.includes("आधार") ||
        t.includes("आधार कार्ड")
    ) {
        return {
            type: "Aadhaar Card",
            category: "Identity",
            confidence: 98
        };
    }

    if (
        t.includes("passport") ||
        t.includes("पारपत्र")
    ) {
        return {
            type: "Passport",
            category: "Identity",
            confidence: 98
        };
    }

    if (
        t.includes("savitribai") ||
        t.includes("university") ||
        t.includes("professor") ||
        t.includes("registrar") ||
        t.includes("विद्यापीठ") ||
        t.includes("महाविद्यालय") ||
        t.includes("प्राध्यापक") ||
        t.includes("कुलसचिव")
    ) {
        return {
            type: "University Document",
            category: "Education",
            confidence: 92
        };
    }

    if (
        t.includes("certificate") ||
        t.includes("प्रमाणपत्र") ||
        t.includes("दाखला")
    ) {
        return {
            type: "Certificate",
            category: "Education",
            confidence: 90
        };
    }

    if (
        t.includes("government of maharashtra") ||
        t.includes("शासन") ||
        t.includes("सरकार") ||
        t.includes("जिल्हा परिषद") ||
        t.includes("ग्रामपंचायत") ||
        t.includes("पंचायत") ||
        t.includes("तहसील") ||
        t.includes("महालेखापाल") ||
        t.includes("कार्यालय") ||
        t.includes("विभाग")
    ) {
        return {
            type: "Government Order/Letter",
            category: "Administration",
            confidence: 80
        };
    }

    return {
        type: "Other",
        category: "General",
        confidence: 60
    };
}