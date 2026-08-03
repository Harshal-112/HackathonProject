const STOP_WORDS = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "page",
    "date",
    "issued",
    "related",
    "subject",
    "reference",
    "number",
    "of",
    "to",
    "in",
    "is",
    "on",
    "by",
    "a",
    "an"
]);

export function extractKeywords(text) {

    const words = text
        .replace(/[^\w\u0900-\u097F\s]/g, " ")
        .toLowerCase()
        .split(/\s+/);

    const freq = {};

    for (const word of words) {

        if (
            word.length < 4 ||
            STOP_WORDS.has(word)
        ) continue;

        freq[word] = (freq[word] || 0) + 1;
    }

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}