export function classifyDocument(text) {

    const t = text.toLowerCase();

    if (
        t.includes("invoice") ||
        t.includes("gst") ||
        t.includes("tax invoice")
    ) {
        return {
            type: "Invoice",
            category: "Finance",
            confidence: 95
        };
    }

    if (
        t.includes("aadhaar") ||
        t.includes("unique identification authority")
    ) {
        return {
            type: "Aadhaar Card",
            category: "Identity",
            confidence: 98
        };
    }

    if (
        t.includes("passport")
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
        t.includes("registrar")
    ) {
        return {
            type: "University Document",
            category: "Education",
            confidence: 92
        };
    }

    if (
        t.includes("certificate")
    ) {
        return {
            type: "Certificate",
            category: "Education",
            confidence: 90
        };
    }

    return {
        type: "Other",
        category: "General",
        confidence: 60
    };
}