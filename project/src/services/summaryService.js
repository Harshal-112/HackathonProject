export function generateSummary(metadata, classification) {

    const parts = [];

    if (classification?.type) {
        parts.push(
            `This is a ${classification.type.toLowerCase()}.`
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

    return parts.join(" ");
}