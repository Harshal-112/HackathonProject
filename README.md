# 🏛️ Smart Digital Documentation System (SDDS)
> **Government of Maharashtra — Digital Document Management & Verification Portal**

![React](https://img.shields.io/badge/React-18.3-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-3.4-38bdf8?logo=tailwindcss)
![Tesseract.js](https://img.shields.io/badge/OCR-Tesseract.js%20WASM-orange)
![License](https://img.shields.io/badge/License-MIT-green)

A production-ready, enterprise-grade, privacy-focused Digital Document Management and Public Verification System designed for District Collector Offices, Municipal Corporations, Taluka Offices, Revenue Departments, RTOs, Gram Panchayats, and Citizens.

---

## 🌟 Key System Capabilities & Architectural Innovations

### 🔒 1. End-to-End Encrypted Mode & Client-Side PII Scrubbing
* **100% In-Browser Local Processing**: When **`🔒 E2E Encrypted Mode`** is toggled ON in the top navigation bar, OCR text extraction, document classification, indexing, and metadata extraction execute **entirely inside the browser via WebAssembly (Tesseract.js)**. Zero data leaves the local device.
* **Automated PII Masker**: When running in Normal AI Mode, citizen **Aadhaar**, **PAN**, **Phone**, **Email**, **Voter ID**, **Passport**, and **GST** numbers are automatically scrubbed on the client side before sending text to external AI endpoints (DPDP Act 2023 compliant).

### 🤖 2. Global Floating AI Chatbot Assistant
* **Accessible Across Every Page**: A floating chat widget available in the bottom-right corner of all tabs (`Dashboard`, `Upload`, `Documents`, `Settings`, etc.).
* **Quick Action Chips**: Instant shortcuts for `📊 Show document stats`, `🔍 Find pending documents`, `📋 Recent uploads`, and `❓ How to upload a document?`.
* **Clean Formatting**: Formats markdown headings, bold text, bullet lists (`•`), and horizontal dividers without raw symbols (`###`, `***`).

### 🏁 3. Public QR Code Verification Portal (`/verify/:id`)
* **Login-Free Verification**: Anyone can scan a printed QR code or visit `/verify/:id` to check document authenticity.
* **Zero PII Exposure**: Uses `getPublicDocumentVerification()` to return **only non-sensitive public fields** (`title`, `status`, `documentNumber`, `department`, `category`, `createdAt`, `approvals`), shielding raw OCR text, internal file paths, and citizen PII.
* **Downloadable SVG QR**: One-click vector QR code export for official physical printouts.

### 📄 4. Multi-Language OCR & Automatic AI Metadata Extraction
* **Languages Supported**: **English**, **Marathi (Devanagari script)**, and **Hindi**.
* **Pre-Processing Pipeline**: 3× image upscaling, ±8° deskewing, Sauvola adaptive binarization, and median noise reduction filter.
* **Instant Auto-Fill**: Drag-and-dropping a scanned document auto-populates **Title**, **Department**, **Category**, **Priority**, and **2-3 Sentence AI Summaries**.

### 🔍 5. AI-Powered Semantic Smart Search
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
    │   │   ├── shared/        # PageHeader, Badges, EmptyState
    │   │   └── ui/            # Button, Card, Input, Modal, Badge, Skeleton
    │   ├── lib/
    │   │   ├── auth-context.jsx    # Supabase Auth state & profile reconciliation
    │   │   ├── privacy-context.jsx # End-to-End Encrypted Mode state
    │   │   ├── theme-context.jsx   # Dark / Light theme provider
    │   │   ├── toast-context.jsx   # Toast notification provider
    │   │   ├── mock-api.js         # Supabase client API wrapper
    │   │   ├── mock-data.js        # Departments, categories & lookup data
    │   │   └── supabase.js         # Supabase client initialization
    │   ├── pages/
    │   │   ├── dashboard.jsx       # Metrics cards & distribution charts
    │   │   ├── upload.jsx          # Drag & drop OCR upload with instant auto-fill
    │   │   ├── document-list.jsx   # Document table with filters & pagination
    │   │   ├── document-details.jsx# OCR text, AI Insights Panel, metadata editor
    │   │   ├── verify.jsx          # Public QR verification portal
    │   │   ├── notifications.jsx   # Real-time notifications with filter pills
    │   │   ├── search.jsx          # Full-width AI semantic search
    │   │   ├── approvals.jsx       # Approve / Reject / Request Changes queue
    │   │   ├── audit-trail.jsx     # Activity logs with IP & user agent tracking
    │   │   ├── reports.jsx         # Analytics reports with CSV/PDF export
    │   │   ├── users.jsx           # User role management (Admin)
    │   │   ├── settings.jsx        # System settings (Admin)
    │   │   ├── forgot-password.jsx # Supabase Auth password recovery
    │   │   ├── reset-password.jsx  # New password entry page
    │   │   ├── login.jsx           # Login page
    │   │   └── register.jsx        # Registration page
    │   ├── services/
    │   │   ├── aiService.js        # Gemini AI API calls, PII masker, AI search
    │   │   ├── ocrEngine.js        # Tesseract.js WASM multi-lingual OCR pipeline
    │   │   ├── metadataService.js  # Heuristic Devanagari & English rule parser
    │   │   ├── smartSearch.js      # Client-side fuzzy search & snippet extractor
    │   │   └── workflowAutomation.js# Auto-routing decision engine
    │   ├── App.jsx                 # Routes setup
    │   ├── main.jsx                # Entry point with ErrorBoundary
    │   └── index.css               # Design system & Tailwind utilities
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
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