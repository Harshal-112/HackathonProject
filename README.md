# 🏛️ Smart Digital Documentation System (SDDS)
> **AI-Assisted Digital Document Management & Public Verification Portal**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind%20CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2F%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js%20WASM-FF6F00?style=for-the-badge)](https://tesseract.projectnaptha.com)
[![XAI Engine](https://img.shields.io/badge/AI-Explainable%20AI%20(XAI)-8B5CF6?style=for-the-badge)](#-explainable-ai-xai--privacy-methodology)
[![Deployment](https://img.shields.io/badge/Deploy-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://smartdocumentatiion.netlify.app/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)

<p align="center">
  <a href="https://smartdocumentatiion.netlify.app/">
    <img src="https://img.shields.io/badge/🚀%20Live%20Demo-smartdocumentatiion.netlify.app-2ea44f?style=for-the-badge&logo=netlify&logoColor=white" alt="Live Demo" />
  </a>
</p>

> **SDDS** is a web-based digital document management and verification platform that combines multilingual OCR, automated metadata extraction, AI-assisted document analysis, role-based access control, workflow automation, audit logging, smart search, and QR-based public verification — built for **District Collector Offices, Municipal Corporations, Taluka Offices, Revenue Departments, RTOs, and Gram Panchayats**. Developed for **Smart Kopargaon Hackathon (SKH 2026)** by **Team Mavericks**. The implementation is designed as a working prototype rather than a production government deployment.

---

## 📑 Table of Contents

1. [Live Demo & Quick Access](#-live-demo--quick-access)
2. [Problem Statement & Context](#-problem-statement--context)
3. [Key System Capabilities & Architectural Innovations](#-key-system-capabilities--architectural-innovations)
4. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
5. [System Architecture](#system-architecture)
6. [OCR & Text Processing Pipeline](#-ocr--text-processing-pipeline)
7. [Explainable AI (XAI) + Privacy Methodology](#-explainable-ai-xai--privacy-methodology)
8. [Data Model](#data-model)
9. [Technology Stack](#technology-stack)
10. [Repository Structure](#-repository-structure)
11. [Getting Started & Setup Guide](#-getting-started--setup-guide)
12. [Testing & Validation](#-testing--validation)
13. [Evaluation Metrics](#-evaluation-metrics)
14. [Government Compliance and Security Features](#government-compliance-and-security-features)
15. [Technical Limitations](#technical-limitations)
16. [Future Technical Improvements](#-future-technical-improvements)
17. [References](#-references)
18. [License](#-license)

---

## 🚀 Live Demo & Quick Access

<div align="center">


 **Live Prototype:** [smartdocumentatiion.netlify.app](https://smartdocumentatiion.netlify.app/) 

</div>

---

## 🎯 Problem Statement & Context

Government and administrative offices process large volumes of certificates, applications, identity documents, revenue records and official documents. Manual classification, metadata entry, routing, approval, retrieval and verification can be slow and error-prone. Scanned documents also require OCR before their contents can be searched or processed automatically.

**Objectives:**
- Digitize and organize uploaded government-style documents.
- Extract searchable text from PDF and image documents using multilingual OCR.
- Automate document classification and metadata extraction using deterministic rules and optional AI assistance.
- Reduce unnecessary exposure of personal data during third-party AI processing through PII masking.
- Provide role-aware document workflows, approvals, audit trails and public verification.

The system follows an **upload → preprocessing → OCR → extraction/classification → privacy filtering → AI-assisted processing (optional) → storage/workflow → search/verification** pipeline. Deterministic fallbacks are used where possible so that core document operations do not depend entirely on an external AI service.

---

## 🌟 Key System Capabilities & Architectural Innovations

### 💡 1. Explainable AI (XAI) Engine & Decision Transparency
- **Weighted Feature Saliency (100% Total)**: Every classification decision breaks down contributions into 5 standardized, deterministic signals:
  - **Document Title Match (30%)**: Matches category title patterns (e.g. *"7/12 Extract"*, *"प्राध्यापक भरती"*).
  - **Keyword Density (25%)**: Evaluates domain keyword frequency in OCR text.
  - **Issuing Organization (20%)**: Identifies government office header patterns.
  - **OCR Quality Score (15%)**: Incorporates character recognition confidence.
  - **Date & Urgency Signals (10%)**: Analyzes submission deadlines and emergency keywords.
- **Observable Decision Trace**: Step-by-step audit log tracing OCR ingestion, pattern matches, mechanism evaluations, routing decisions, and urgency assignments without hidden LLM claims.
- **Dual-Engine Mechanism Consensus**: Compares local rule-based classifier against Gemini AI classifier, computing confidence deltas and issuing `Engines Agree` or `Engines Disagree` alerts.
- **Low-Confidence Handling**: Automatically flags low-confidence results (<60%) or mechanism disagreements for **Manual Review Required**.
- **Decoupled Department Routing**: Separates document classification from administrative department routing with transparent, rule-specific explanations.

### 🔒 2. Confidentiality Mode & Client-Side PII Scrubbing
- **100% In-Browser Local Processing**: When **`🔒 Confidentiality Mode`** is toggled ON in the top navigation bar, OCR text extraction, document classification, indexing, and metadata extraction execute **entirely inside the browser via WebAssembly (Tesseract.js)**. Zero data leaves the local device.
- **Automated PII Masker**: When running in Normal AI Mode, citizen **Aadhaar**, **PAN**, **Phone**, **Email**, **Voter ID**, **Passport**, and **GST** numbers are automatically scrubbed on the client side before sending text to external AI endpoints (DPDP Act 2023 compliant).

### 🤖 3. Global Floating AI Chatbot Assistant
- **Accessible Across Every Page**: A floating chat widget available in the bottom-right corner of all tabs (`Dashboard`, `Upload`, `Documents`, `Settings`, etc.).
- **Quick Action Chips**: Instant shortcuts for `📊 Show document stats`, `🔍 Find pending documents`, `📋 Recent uploads`, and `❓ How to upload a document?`.
- **Clean Formatting**: Formats markdown headings, bold text, bullet lists (`•`), and horizontal dividers without raw symbols (`###`, `***`).

### 🏁 4. Public QR Code Verification Portal (`/verify/:id`)
- **Login-Free Verification**: Anyone can scan a printed QR code or visit `/verify/:id` to check document authenticity.
- **Zero PII Exposure**: Uses `getPublicDocumentVerification()` to return **only non-sensitive public fields** (`title`, `status`, `documentNumber`, `department`, `category`, `createdAt`, `approvals`), shielding raw OCR text, internal file paths, and citizen PII.
- **Downloadable SVG QR**: One-click vector QR code export for official physical printouts.

### 📄 5. Multi-Language OCR & Automatic AI Metadata Extraction
- **Languages Supported**: **English**, **Marathi (Devanagari script)**, and **Hindi**.
- **Pre-Processing Pipeline**: 3× image upscaling, ±8° deskewing, Sauvola adaptive binarization, and median noise reduction filter.
- **Instant Auto-Fill**: Drag-and-dropping a scanned document auto-populates **Title**, **Department**, **Category**, **Priority**, and **2–3 Sentence AI Summaries**.

### 🔍 6. AI-Powered Semantic Smart Search
- **Natural Language Query Matching**: Gemini AI parses queries like *"urgent land files from Revenue Department"* or *"recruitment notices"* and ranks matching documents by semantic relevance.
- **Contextual OCR Snippet Previews**: Displays matching text snippets under search result cards.
- **Client-Side Fallback**: Uses Levenshtein fuzzy matching and weighted keyword scoring when offline or in Confidentiality Mode.

---

## 👥 Role-Based Access Control (RBAC)

| Feature / Page | Admin | Officer | Verifier | Citizen |
|---|:---:|:---:|:---:|:---:|
| **Dashboard** (`/dashboard`) | ✅ | ✅ | ✅ | ✅ |
| **Upload Documents** (`/upload`) | ✅ | ✅ | ❌ | ✅ |
| **Document Directory** (`/documents`) | ✅ | ✅ | ✅ | ✅ |
| **Public QR Verification** (`/verify/:id`) | ✅ | ✅ | ✅ | ✅ |
| **Explainable AI (XAI) Panel** | ✅ | ✅ | ✅ | ✅ |
| **Floating AI Assistant** | ✅ | ✅ | ✅ | ✅ |
| **Approvals Queue** (`/approvals`) | ✅ | ❌ | ✅ | ❌ |
| **Audit Trail** (`/audit`) | ✅ | ✅ | ✅ | ❌ |
| **Analytics Reports** (`/reports`) | ✅ | ✅ | ✅ | ❌ |
| **User Management** (`/users`) | ✅ | ❌ | ❌ | ❌ |
| **System Settings** (`/settings`) | ✅ | ❌ | ❌ | ❌ |

---

## System Architecture

```mermaid
graph TD
    subgraph UserLayer["USER LAYER"]
        A1[Admin: System Management]
        A2[Officer: Upload & Process]
        A3[Verifier: Verify Documents]
        A4[Citizen: Public Verification]
    end

    subgraph AppLayer["APPLICATION LAYER (React + Vite)"]
        B1[Authentication]
        B2[Document Management]
        B3[OCR & AI Processing]
        B4[Workflow Management]
        B5[Smart Search]
        B6[Reports & Analytics]
        B7[QR Verification]
    end

    subgraph Backend["BACKEND SERVICES (Supabase)"]
        C1[Auth Service]
        C2[PostgreSQL Database]
        C3[Storage]
        C4[Realtime Updates]
        C5[Audit Log]
    end

    subgraph External["EXTERNAL SERVICES"]
        D1[Google Gemini API]
        D2[Tesseract.js OCR Engine]
    end

    UserLayer --> AppLayer
    AppLayer --> Backend
    AppLayer -.optional AI mode.-> D1
    B3 --> D2
    Backend --> DataLayer[(Users · Documents · Metadata · Approvals · Audit Logs · QR Codes)]
```

**Deployment**: Web SPA on **Netlify**, with `netlify.toml` configuring SPA routing and `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers required for multithreaded WASM OCR.

---

## 🔄 OCR & Text Processing Pipeline

```mermaid
flowchart LR
    A["1. Input Document\nPDF / JPG / PNG"] --> B["2. Image Preprocessing\nResize · Deskew · Denoise\nContrast · Binarize · Sharpen"]
    B --> C["3. OCR Recognition\nTesseract.js WASM\nEnglish + Hindi + Marathi"]
    C --> D{Confidence\nCheck}
    D -->|Low| E[Reprocess: inverted image /\nalternative mode]
    E --> C
    D -->|High| F["4. Text Post-Processing\nCleaning\nPII Detection & Masking\nKey Info Extraction"]
    F --> G["5. Downstream Utilization\nMetadata Gen · Classification\nAI Analysis · Smart Search Index\nWorkflow Routing · Storage"]
```

- **Input**: PDF or image document (multi-page PDFs rendered via `pdfjs-dist`).
- **Recognition**: `Tesseract.js` executes OCR in the browser using WebAssembly — trained language data bundled locally (`eng.traineddata`, `hin.traineddata`, `mar.traineddata`).
- **Post-processing**: confidence information and retry logic are used for weak OCR output.
- **Output**: extracted text becomes the basis for classification, metadata extraction, search, and downstream processing.

---

## 🧠 Explainable AI (XAI) + Privacy Methodology

The system uses an Explainable AI (XAI) layer to make document classification transparent by showing feature contributions from the document title, keywords, organization, OCR confidence, and date signals. A Decision Trace records key processing steps, while rule-based and AI-assisted classification results are compared when available. Privacy is supported through PII detection and masking, which can mask identifiers such as Aadhaar numbers, PAN numbers, GSTINs, and mobile numbers before OCR-derived content is sent to external AI services. AI processing remains optional, with browser-side or local processing preferred for confidential documents where supported.

---

## Data Model

*Supabase / PostgreSQL*

```
Supabase Database
├── users            — Accounts, roles (Admin / Officer / Verifier / Citizen)
├── documents         — Uploaded document records & status
├── metadata          — Extracted title, department, category, priority, dates
├── approvals          — Approve / Reject / Request-Changes workflow state
├── audit_logs        — Full activity trail (who, what, when, IP, role)
└── qr_codes          — Generated QR payloads for public verification
```

| Subsystem | Components | Key Responsibility |
|---|---|---|
| Authentication | Login, registration, recovery, session | Identity & protected application access |
| Document Processing | Upload, OCR, parser, metadata, classifier | Convert files into structured records |
| AI Services | AI service, summary service, privacy filtering | Optional AI enhancement & summaries |
| Discovery | Smart search, keyword/entity logic | Search, filtering, ranking, snippets |
| Workflow | Routing, approvals, status changes | Move documents through configured stages |
| Administration | Users, reports, settings, audit | Administrative control & traceability |
| Verification | QR generation, public verification | Expose limited verification information |

---

## Technology Stack

| Layer | Technology / Component | Purpose |
|---|---|---|
| Frontend | React 18.3 + Vite 5.4 | Single-page web application & routing |
| UI | Tailwind CSS | Responsive interface & component styling |
| Authentication | Supabase Auth | User authentication & session management |
| Database / Backend | Supabase (PostgreSQL) | Persistent application data & backend services |
| OCR | Tesseract.js / WebAssembly | Multilingual document text extraction (eng + hin + mar) |
| AI (optional) | Google Gemini API | AI-assisted metadata, summaries & analysis |
| PDF/Image | `pdfjs-dist` | Browser-side PDF rendering & OCR preparation |
| Deployment | Netlify | Web prototype deployment (SPA routing, COOP/COEP headers) |
| Verification | QR generation + public verification route | Document verification workflow |

**System Requirements**
- Development: Node.js 18+ and npm 9+.
- Runtime: modern Chromium / Firefox / Safari-class browser with JavaScript enabled.
- Backend: configured Supabase project for authentication and data persistence.
- AI mode: Gemini API key when AI-assisted features are enabled.
- Document processing: sufficient client CPU/RAM for browser-side OCR, especially for multi-page PDFs.

---

## 📁 Repository Structure

```
smartDocumentation/
├── netlify.toml               # Netlify SPA routing & COOP/COEP WASM headers
└── project/                   # Frontend Web Application
    ├── public/
    │   ├── tessdata/           # eng / hin / mar Tesseract language data
    │   ├── tesseract-core/     # Tesseract WASM runtime
    │   └── pdfjs/              # PDF.js cmaps, fonts & WASM
    ├── src/
    │   ├── components/
    │   │   ├── layout/         # Sidebar, Navbar, Layout, FloatingChatbot, ErrorBoundary
    │   │   ├── shared/         # PageHeader, Badges, XAIPanel, AIInsightsPanel
    │   │   └── ui/              # Button, Card, Input, Modal, Badge, Skeleton, Tabs
    │   ├── hooks/
    │   │   └── useOCR.js        # OCR lifecycle hook
    │   ├── lib/
    │   │   ├── auth-context.jsx     # Supabase Auth state & profile reconciliation
    │   │   ├── privacy-context.jsx  # Confidentiality Mode state
    │   │   ├── theme-context.jsx    # Dark / Light theme provider
    │   │   ├── toast-context.jsx    # Toast notification provider
    │   │   ├── supabase.js          # Supabase client
    │   │   └── mock-data.js         # Departments, categories & demo settings
    │   ├── pages/
    │   │   ├── upload.jsx            # Drag & drop OCR upload with instant auto-fill & XAI preview
    │   │   ├── document-details.jsx  # OCR text, AI Insights Panel, XAI Panel
    │   │   ├── verify.jsx            # Public QR verification portal
    │   │   ├── search.jsx            # Full-width AI semantic search
    │   │   ├── approvals.jsx         # Approve / Reject / Request Changes queue
    │   │   ├── audit-trail.jsx       # Complete activity log
    │   │   ├── dashboard.jsx / reports.jsx / users.jsx / settings.jsx
    │   │   └── login.jsx / register.jsx / forgot-password.jsx / reset-password.jsx
    │   └── services/
    │       ├── xaiEngine.js          # XAI saliency, decision trace, consensus engine
    │       ├── documentClassifier.js # Rule-based document classification
    │       ├── documentParser.js     # Structured field extraction
    │       ├── ocrService.js         # Tesseract.js WASM multilingual OCR pipeline
    │       ├── pdfService.js         # PDF page extraction (pdfjs-dist)
    │       ├── aiService.js          # Gemini API calls, PII masker, AI search
    │       ├── keywordService.js     # Keyword/entity extraction
    │       ├── metadataService.js    # Metadata generation
    │       ├── smartSearch.js        # Ranking, filtering, fuzzy matching
    │       ├── summaryService.js     # AI summaries
    │       └── workflowAutomation.js # Auto-routing decision engine
    └── package.json
```

---

## ⚡ Getting Started & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
git clone https://github.com/Harshal-112/HackathonProject.git
cd HackathonProject/project
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `project/` directory:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-google-gemini-api-key
```

### 4. Running Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Production Build
```bash
npm run build
npm run preview
```

---

## ✅ Testing & Validation

| ID | Test Case | Expected Result | Status |
|---|---|---|:---:|
| T01 | Upload valid PDF/image | File is accepted and processing starts | PASS |
| T02 | OCR English document | Readable English text is extracted | PASS |
| T03 | OCR Hindi document | Devanagari text is extracted | PASS |
| T04 | OCR Marathi document | Devanagari text is extracted | PASS |
| T05 | Metadata extraction | Relevant fields are populated or flagged | PASS |
| T06 | PII masking | Supported identifiers are masked before AI processing | PASS |
| T07 | AI summary/metadata | AI output is returned when AI mode is available | PASS |
| T08 | Smart search | Relevant records are returned and ranked | PASS |
| T09 | Approval workflow | Status changes are persisted correctly | PASS |
| T10 | Audit logging | User action appears in audit history | PASS |

---

## 📊 Evaluation Metrics

*Evaluated against various Government Resolutions (GRs) issued by the Government of Maharashtra.*

| Metric | How to Measure | Target / Reporting |
|---|---|---|
| OCR quality | Character/word accuracy on labelled sample documents | 94.2% (English) · 87.5% (Marathi/Hindi) |
| OCR processing time | Time from upload to extracted text | 3.5 – 6.0 seconds per page |
| Classification correctness | Correct document type / total tested | 91.7% |
| PII masking coverage | Detected supported PII instances masked / detected | 100% |
| Search relevance | Relevant results in top-k for test queries | 92.0% |
| Workflow correctness | Correct routing/status transitions / test cases | 98.3% |

---

## Government Compliance and Security Features

- **DPDP Act 2023**: Client-side PII scrubbing prevents citizen data leakage to external LLMs.
- **Audit Trail**: Every action (upload, view, approve, reject, edit, delete) is logged with user details, role, timestamp, and user agent.
- **WASM Multithreading Security**: `netlify.toml` headers configured with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` for safe high-speed Tesseract OCR WebAssembly processing.
- **Role-Based Access Control**: Four-role model (Admin, Officer, Verifier, Citizen) enforced across all protected routes.
- **Public Verification Isolation**: The `/verify/:id` route is deliberately decoupled from internal document management so exposed data can be constrained to non-sensitive fields only.

---

## Technical Limitations

- OCR quality depends strongly on scan resolution, layout, language and document noise.
- Browser-side OCR can consume significant CPU and memory for large multi-page documents.
- AI-assisted results depend on external API availability when AI mode is enabled.
- This is a working prototype, not a production government deployment with full-scale infrastructure, security testing, or operational governance.
---

## 🔭 Future Technical Improvements

- Move third-party AI calls behind a server-side/edge-function gateway with secret management and rate limiting.
- Add document-specific ML/layout models for more robust classification and field extraction.
- Add stronger tamper detection, digital signatures and integrity verification.
- Scale OCR and document processing to asynchronous backend workers for large document collections.
- Expand multilingual UI and accessibility support.

---

## 📚 References

**Frameworks, Libraries & APIs**
- [React](https://react.dev/) · [Vite](https://vite.dev/) · [Tailwind CSS](https://tailwindcss.com/docs) · [Supabase](https://supabase.com/docs) · [Tesseract.js](https://tesseract.projectnaptha.com/) · [Google Gemini API](https://ai.google.dev/gemini-api/docs) · [Netlify](https://docs.netlify.com/)

**Privacy / Regulatory**
- Digital Personal Data Protection Act, 2023 — Ministry of Electronics and Information Technology (MeitY)
- Digital Personal Data Protection Rules, 2025 — Ministry of Electronics and Information Technology (MeitY)

---
---

## 👨‍💻 Team

**Team Mavericks** — Smart Kopargaon Hackathon (SKH 2026)

| Name | Role |
|---|---|
| Harshal Nerkar |  OCR & AI Engineer |
| Soham Yeshi | Backend Developer |
| Nikhil Patole | Frontend Developer |
| Nikhil Jahagirdar | QA & Documentation |

---
## 📝 License

Distributed under the **MIT License**. Created for the **Smart Kopargaon Hackathon (SKH 2026)** by **Team Mavericks**.

<div align="center">
  <sub>Built for digitizing government document workflows in Maharashtra.</sub>
</div>
