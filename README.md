# 🏛️ Smart Digital Documentation System (SDDS)
> **Digital Document Management & Verification Portal**

![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?logo=supabase)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js%20WASM-orange)
![XAI Engine](https://img.shields.io/badge/AI-Explainable%20AI%20%28XAI%29-violet)
![License](https://img.shields.io/badge/License-MIT-green)

A digital document management and public verification system built for District Collector Offices, Municipal Corporations, Taluka Offices, Revenue Departments, RTOs, and Gram Panchayats — built for **Smart Kopargaon Hackathon (SKH 2026)** by **Team Mavericks**.

---

## 🌟 Key System Capabilities & Architectural Innovations

### 💡 1. Explainable AI (XAI) Engine & Decision Transparency
* **Weighted Feature Saliency (100% Total)**: Every classification decision breaks down contributions into 5 standardized, deterministic signals:
  - **Document Title Match (30%)**: Matches category title patterns (e.g. *"7/12 Extract"*, *"प्राध्यापक भरती"*).
  - **Keyword Density (25%)**: Evaluates domain keyword frequency in OCR text.
  - **Issuing Organization (20%)**: Identifies government office header patterns.
  - **OCR Quality Score (15%)**: Incorporates character recognition confidence.
  - **Date & Urgency Signals (10%)**: Analyzes submission deadlines and emergency keywords.
* **Observable Decision Trace**: Step-by-step audit log tracing OCR ingestion, pattern matches, mechanism evaluations, routing decisions, and urgency assignments without hidden LLM claims.
* **Dual-Engine Mechanism Consensus**: Compares local rule-based classifier against Gemini AI classifier, computing confidence deltas and issuing `Engines Agree` or `Engines Disagree` alerts.
* **Low-Confidence Handling**: Automatically flags low-confidence results ($<60\%$) or mechanism disagreements for **Manual Review Required**.
* **Decoupled Department Routing**: Separates document classification from administrative department routing with transparent, rule-specific explanations.

### 🔒 2. End-to-End Encrypted Mode & Client-Side PII Scrubbing
* **100% In-Browser Local Processing**: When **`🔒 E2E Encrypted Mode`** is toggled ON in the top navigation bar, OCR text extraction, document classification, indexing, and metadata extraction execute **entirely inside the browser via WebAssembly (Tesseract.js)**. Zero data leaves the local device.
* **Automated PII Masker**: When running in Normal AI Mode, citizen **Aadhaar**, **PAN**, **Phone**, **Email**, **Voter ID**, **Passport**, and **GST** numbers are automatically scrubbed on the client side before sending text to external AI endpoints (DPDP Act 2023 compliant).

### 🤖 3. Global Floating AI Chatbot Assistant
* **Accessible Across Every Page**: A floating chat widget available in the bottom-right corner of all tabs (`Dashboard`, `Upload`, `Documents`, `Settings`, etc.).
* **Quick Action Chips**: Instant shortcuts for `📊 Show document stats`, `🔍 Find pending documents`, `📋 Recent uploads`, and `❓ How to upload a document?`.
* **Clean Formatting**: Formats markdown headings, bold text, bullet lists (`•`), and horizontal dividers without raw symbols (`###`, `***`).

### 🏁 4. Public QR Code Verification Portal (`/verify/:id`)
* **Login-Free Verification**: Anyone can scan a printed QR code or visit `/verify/:id` to check document authenticity.
* **Zero PII Exposure**: Uses `getPublicDocumentVerification()` to return **only non-sensitive public fields** (`title`, `status`, `documentNumber`, `department`, `category`, `createdAt`, `approvals`), shielding raw OCR text, internal file paths, and citizen PII.
* **Downloadable SVG QR**: One-click vector QR code export for official physical printouts.

### 📄 5. Multi-Language OCR & Automatic AI Metadata Extraction
* **Languages Supported**: **English**, **Marathi (Devanagari script)**, and **Hindi**.
* **Pre-Processing Pipeline**: 3× image upscaling, ±8° deskewing, Sauvola adaptive binarization, and median noise reduction filter.
* **Instant Auto-Fill**: Drag-and-dropping a scanned document auto-populates **Title**, **Department**, **Category**, **Priority**, and **2-3 Sentence AI Summaries**.

### 🔍 6. AI-Powered Semantic Smart Search
* **Natural Language Query Matching**: Gemini AI parses queries like *"urgent land files from Revenue Department"* or *"recruitment notices"* and ranks matching documents by semantic relevance.
* **Contextual OCR Snippet Previews**: Displays matching text snippets under search result cards.
* **Client-Side Fallback**: Uses Levenshtein fuzzy matching and weighted keyword scoring when offline or in E2E Encrypted Mode.

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
| **Approvals Queue** (`/approvals`) | ✅ | ✅ | ✅ | ❌ |
| **Audit Trail** (`/audit`) | ✅ | ✅ | ✅ | ❌ |
| **Analytics Reports** (`/reports`) | ✅ | ✅ | ✅ | ❌ |
| **User Management** (`/users`) | ✅ | ❌ | ❌ | ❌ |
| **System Settings** (`/settings`) | ✅ | ❌ | ❌ | ❌ |

---

## 📁 Repository Structure

```
smartDocumentation/
├── netlify.toml               # Netlify SPA routing & COOP/COEP WASM headers
└── project/                   # Frontend Web Application
    ├── public/                # Static assets & icons
    ├── src/
    │   ├── components/
    │   │   ├── layout/        # Sidebar, Navbar, Layout, FloatingChatbot, ErrorBoundary
    │   │   ├── shared/        # PageHeader, Badges, XAIPanel, AIInsightsPanel
    │   │   └── ui/            # Button, Card, Input, Modal, Badge, Skeleton
    │   ├── lib/
    │   │   ├── auth-context.jsx    # Supabase Auth state & profile reconciliation
    │   │   ├── privacy-context.jsx # End-to-End Encrypted Mode state
    │   │   ├── theme-context.jsx   # Dark / Light theme provider
    │   │   ├── toast-context.jsx   # Toast notification provider
    │   │   ├── mock-api.js         # Supabase client API wrapper
    │   │   └── mock-data.js        # Departments, categories & DEMO_SETTINGS
    │   ├── pages/
    │   │   ├── upload.jsx          # Drag & drop OCR upload with instant auto-fill & XAI preview
    │   │   ├── document-details.jsx# OCR text, AI Insights Panel, XAI Panel
    │   │   ├── verify.jsx          # Public QR verification portal
    │   │   ├── search.jsx          # Full-width AI semantic search
    │   │   ├── approvals.jsx       # Approve / Reject / Request Changes queue
    │   │   └── ...
    │   ├── services/
    │   │   ├── xaiEngine.js        # XAI Saliency, Decision Trace, Consensus engine
    │   │   ├── documentClassifier.js# Disambiguated GR/Corrigendum & court classifier
    │   │   ├── aiService.js        # Gemini AI API calls, PII masker, AI search
    │   │   ├── ocrEngine.js        # Tesseract.js WASM multi-lingual OCR pipeline
    │   │   └── workflowAutomation.js# Auto-routing decision engine
    └── package.json
```

---

## ⚡ Getting Started & Setup Guide

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Navigate to project directory
cd project

# Install dependencies
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
# Start development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Production Build
```bash
# Generate optimized production bundle
npm run build

# Preview build locally
npm run preview
```

---

## 🏛️ Government Compliance & Security Features
* **DPDP Act 2023**: Client-side PII scrubbing prevents citizen data leakage to external LLMs.
* **Audit Trail**: Every action (upload, view, approve, reject, edit, delete) is logged with user details, role, timestamp, and user agent.
* **WASM Multithreading Security**: `netlify.toml` headers configured with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` for safe high-speed Tesseract OCR WebAssembly processing.

---

## 📝 License
Distributed under the **MIT License**. Created for the **Smart Kopargaon Hackathon (SKH 2026)** by **Team Mavericks**.
