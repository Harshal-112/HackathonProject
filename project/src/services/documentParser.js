import {
  extractTitle,
  extractOrganization,
  extractSubject,
  extractPost,
  extractDocumentNumber,
  extractEmails,
  extractPhones,
  extractReferenceNumbers,
  extractDates,
  detectLanguage
} from "./metadataService";
import { extractKeywords } from "./keywordService";

export function parseDocument(text) {

  return {

    title: extractTitle(text),

    organization: extractOrganization(text),

    keywords: extractKeywords(text),
    
    subject: extractSubject(text),

    post: extractPost(text),

    documentNumber: extractDocumentNumber(text),

    emails: extractEmails(text),

    phones: extractPhones(text),

    referenceNumbers: extractReferenceNumbers(text),

    dates: extractDates(text),

    language: detectLanguage(text)

  };

}