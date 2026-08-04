export function generateSummary(metadata, classification) {

    const parts = [];

    if (classification?.type && classification.type !== "Other") {
        const article = /^[aeiou]/i.test(classification.type) ? "an" : "a";
        parts.push(
            `This document was classified as ${article} ${classification.type}.`
        );
    }

    if (metadata.organization) {
        parts.push(
            `Issued by ${metadata.organization}.`
        );
    }

    if (metadata.subject) {
        parts.push(
            `Subject: ${metadata.subject}.`
        );
    }

    if (metadata.post) {
        parts.push(
            `Related to the post of ${metadata.post}.`
        );
    }

    if (metadata.documentNumber) {
        parts.push(
            `Reference Number: ${metadata.documentNumber}.`
        );
    }

    if (metadata.importantDates?.length) {
        parts.push(
            `Important Date: ${metadata.importantDates[0]}.`
        );
    }

    if (!parts.length) {
        return "This document's content couldn't be reliably identified from OCR. Please review it manually and fill in any missing details."
    }

    return parts.join(" ");
}