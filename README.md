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
=======
> **An SDDS hackathon MVP/prototype demonstrating AI-assisted document digitization, department-scoped verification, privacy-aware processing, auditability, and document verification.**

![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?logo=supabase)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js%20WASM-orange)
![XAI Engine](https://img.shields.io/badge/AI-Explainable%20AI%20%28XAI%29-violet)
![Tests](https://img.shields.io/badge/Tests-27%20Passed-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

A prototype document management and verification portal designed for District Collector Offices, Municipal Corporations, Revenue Departments, RTOs, and Gram Panchayats — built for **Smart Kopargaon Hackathon (SKH 2026)** by **Team Mavericks**.
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)

---

## 🌟 Currently Implemented Capabilities

### 💡 1. Explainable AI (XAI) Engine & Decision Transparency
<<<<<<< HEAD
- **Weighted Feature Saliency (100% Total)**: Every classification decision breaks down contributions into 5 standardized, deterministic signals:
=======
* **5 Weighted Feature Saliency Signals (100% Total)**: Every classification decision breaks down contributions into standardized, deterministic signals:
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)
  - **Document Title Match (30%)**: Matches category title patterns (e.g. *"7/12 Extract"*, *"प्राध्यापक भरती"*).
  - **Keyword Density (25%)**: Evaluates domain keyword frequency in OCR text.
  - **Issuing Organization (20%)**: Identifies government office header patterns.
  - **OCR Quality Score (15%)**: Incorporates character recognition confidence.
  - **Date & Urgency Signals (10%)**: Analyzes submission deadlines and emergency keywords.
<<<<<<< HEAD
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
=======
* **Observable Decision Trace**: Step-by-step audit log tracing OCR ingestion, pattern matches, mechanism evaluations, routing decisions, and urgency assignments.
* **Classification Mechanism Comparison**: Compares rule-based classifier against Gemini AI output, computing confidence deltas and indicating model agreement or disagreement.
* **Low-Confidence Handling**: Automatically flags low-confidence results ($<60\%$) or mechanism disagreements for manual review.
* **Decoupled Department Routing**: Separates document classification from administrative department routing with transparent explanations.

### 🛡️ 2. Department-Scoped Verifier RBAC & Oversight
* **Strict Role-Based Authority**: Verifiers can approve/reject documents **only** if:
  - Account status is `active`
  - Assigned department matches the document's department
  - Document is assigned specifically to that verifier (`assigned_verifier_id = auth.uid()`)
  - Document status is `pending` or `re_verification`
* **Admin Oversight & Monitor Mode**: Admins monitor queues across all departments with view-only access on the Approvals page (no direct operational approve/reject buttons).
* **Flag for Re-verification**: Admins can flag an approved/rejected document for fresh review (`status = re_verification`) with mandatory reason and reassignment to another verifier, permanently preserving prior approval history.
* **Realtime Account Suspension**: Admin suspension sets `status = inactive`, immediately terminating active sessions via Supabase Realtime subscriptions.
* **Controlled Database RPC**: Approvals, rejections, and change requests execute atomically via `process_document_decision()` with row-level locks, preventing unauthorized metadata tampering.

### 🔒 3. Privacy-Focused Local Processing & PII Sanitization
* **In-Browser Local Processing**: When **`🔒 Local Processing Mode`** is enabled, OCR text extraction and classification execute **entirely inside the browser via WebAssembly (Tesseract.js)**.
* **Pre-Flight PII Sanitization**: When cloud AI is active, citizen **Aadhaar**, **PAN**, **Phone**, **Email**, **Voter ID**, **Passport**, and **GST** numbers are normalized and redacted before sending text to external endpoints.
* **Fail-Safe Sanitization**: If sensitive patterns cannot be confidently masked, cloud processing is skipped safely without leaking raw PII.
* **Secure Server-Side AI**: Gemini API calls are routed through an authenticated Supabase Edge Function (`gemini-process`) with server-side secret management and rate limiting. No API keys are embedded in frontend bundles.

### 🏁 4. Public QR Code Verification Portal (`/verify/:id`)
* **Login-Free Verification**: Anyone can scan a printed QR code or visit `/verify/:id` to check document authenticity.
* **Data-Minimization Enforced**: Returns **only non-sensitive public fields** (`documentNumber`, `status`, `department`, `category`, `createdAt`, `updatedAt`, `isAuthentic`), shielding internal verifier names, citizen PII, and storage URLs.
* **Downloadable SVG QR**: One-click vector QR code export for official physical printouts.

### 📄 5. Multi-Language OCR & Automated Metadata Routing
* **Languages Supported**: **English**, **Marathi (Devanagari script)**, and **Hindi**.
* **Pre-Processing Pipeline**: 3× image upscaling, ±8° deskewing, Sauvola adaptive binarization, and median noise reduction filter.
* **Server-Side Document Numbering**: Transactionally generates unique, collision-free identifiers formatted as `SDDS-<DEPT>-YYYY-XXXXXX` via PostgreSQL sequence triggers.
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)

---

## 📊 Classification Benchmark & Evaluation

The rule-based classifier and department routing logic were evaluated against a ground-truth dataset (`tests/data/classification-benchmark.json`) of diverse Maharashtra government document types:

| Metric | Benchmark Result | Target SLA |
|---|:---:|:---:|
| **Type / Category Classification Accuracy** | **80.0%** (8/10) | $\ge 75\%$ |
| **Department Routing Accuracy** | **90.0%** (9/10) | $\ge 80\%$ |
| **Automated Unit Tests** | **27 / 27 Passed** | $100\%$ |

---

## 👥 Role Matrix

| Capability | Admin | Officer | Verifier | Citizen |
|---|:---:|:---:|:---:|:---:|
| **Dashboard** (`/dashboard`) | View All | View All | View All | View Own |
| **Upload Documents** (`/upload`) | ✅ | ✅ | ❌ | ✅ |
| **Document Directory** (`/documents`) | View All | View All | Assigned Dept | Own Uploads |
| **Public QR Verification** (`/verify/:id`) | ✅ | ✅ | ✅ | ✅ |
<<<<<<< HEAD
| **Explainable AI (XAI) Panel** | ✅ | ✅ | ✅ | ✅ |
| **Floating AI Assistant** | ✅ | ✅ | ✅ | ✅ |
| **Approvals Queue** (`/approvals`) | ✅ | ❌ | ✅ | ❌ |
| **Audit Trail** (`/audit`) | ✅ | ✅ | ✅ | ❌ |
| **Analytics Reports** (`/reports`) | ✅ | ✅ | ✅ | ❌ |
| **User Management** (`/users`) | ✅ | ❌ | ❌ | ❌ |
| **System Settings** (`/settings`) | ✅ | ❌ | ❌ | ❌ |
=======
| **Approvals Queue** (`/approvals`) | Monitor Only | View | Act on Assigned | ❌ |
| **Flag for Re-verification** | ✅ | ❌ | ❌ | ❌ |
| **Suspend Verifier** | ✅ | ❌ | ❌ | ❌ |
| **Audit Trail** (`/audit`) | View All | View | View | ❌ |
| **User Management** (`/users`) | Full Admin | ❌ | ❌ | ❌ |

---

## 🔮 Future / Planned Features

* [ ] Digilocker API integration for automated citizen document pulling.
* [ ] Hardware Security Module (HSM) / eSign PKI digital signatures.
* [ ] Multi-tenant isolation for separate district administrations.
* [ ] Automated biometric / face matching for identity verification.
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)

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
<<<<<<< HEAD
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
=======
├── supabase/
│   ├── functions/
│   │   └── gemini-process/         # Secure authenticated Edge Function for Gemini API
│   └── migrations/
│       ├── 001_initial_schema.sql  # Schema, sequence, doc numbering trigger, RLS
│       ├── 002_rbac_verifier_assignment.sql # Verifier policies & Realtime pub
│       ├── 003_document_decision_rpc.sql    # Atomic decision RPC function
│       └── 004_audit_triggers.sql           # Tamper-resistant server-side audit triggers
├── project/                        # Frontend Web Application
│   ├── src/
│   │   ├── components/             # Layout, UI components, XAI & AI panels
│   │   ├── lib/
│   │   │   ├── api.js              # Canonical API module & Supabase client wrapper
│   │   │   ├── auth-context.jsx    # Supabase Auth state & Realtime suspension watch
│   │   │   └── supabase.js         # Supabase client initialization
│   │   ├── pages/                  # Upload, Approvals, Users, Document Details, Verify
│   │   └── services/
│   │       ├── aiService.js        # Secure AI proxy & semantic search
│   │       ├── piiService.js       # OCR-tolerant PII detection & fail-soft masking
│   │       ├── xaiEngine.js        # Saliency analysis, decision trace & consensus
│   │       ├── documentClassifier.js # Bilingual rule-based classifier
│   │       └── workflowAutomation.js # Routing & overdue SLA calculation
│   └── tests/                      # Automated Vitest test suites (27 unit tests)
│       ├── pii.test.js
│       ├── xai.test.js
│       ├── rbac-auth.test.js
│       ├── document-workflow.test.js
│       ├── security-check.test.js
│       └── classification-benchmark.test.js
└── package.json
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)
```

---

## ⚡ Getting Started & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
<<<<<<< HEAD
git clone https://github.com/Harshal-112/HackathonProject.git
cd HackathonProject/project
=======
cd project
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `project/` directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Running Automated Tests
```bash
# Run all unit tests & benchmark evaluations
npm test

# Run tests with coverage
npm run test:coverage
```

### 5. Running the Application Locally
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 6. Production Build
```bash
npm run build
<<<<<<< HEAD
npm run preview
=======
>>>>>>> bb28bd9 (feat: complete SDDS security, RBAC oversight, XAI, and privacy overhaul)
```

---

<<<<<<< HEAD
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
