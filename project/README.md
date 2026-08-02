# Smart Digital Documentation System for Government Offices

A production-ready, AI-powered document management system designed for District Offices, Municipal Corporations, Collector Offices, Taluka Offices, Revenue Departments, RTO, and Gram Panchayats.

## Features

### Core Features
- **Secure Authentication** — JWT-based login with refresh tokens, forgot password with OTP verification, role-based access control (Admin, Officer, Verifier, Citizen)
- **Government Dashboard** — Statistics cards, recent documents, pending approvals, charts, notifications, recent activity
- **Drag & Drop Upload** — Multi-file upload with preview, progress bar, validation (PDF, JPG, PNG, DOCX)
- **OCR Engine** — Automatic text extraction, language detection, page count, name/address/date extraction
- **AI Metadata Extraction** — Auto-generated title, category, department, tags, keywords, priority, summary, suggested folder, confidence score
- **Smart Search** — Natural language search across file names, document numbers, OCR text, AI summaries, and metadata
- **Document Management** — Data table with pagination, sorting, filtering, CSV export, bulk actions, version history
- **Approval Dashboard** — Pending files, approve/reject/request changes, comments, digital signature placeholder, approval timeline
- **Audit Trail** — Complete activity logging (login, upload, download, delete, approval, metadata change, search) with IP address and user agent
- **Notifications** — Bell icon with unread count, approval/rejection/upload notifications
- **Reports** — Daily/weekly/monthly reports by department, user, and document type with CSV/PDF export
- **User Management** — Create, edit, delete, assign roles, deactivate users (admin only)
- **Settings** — Theme (light/dark), AI settings, OCR settings, departments, categories management

### Bonus AI Features
- AI Document Classification
- AI Duplicate Detection
- AI Similar Document Search
- AI Smart Folder Recommendation
- AI Document Summary
- AI Auto Tagging
- AI Missing Field Detection
- AI Chat Assistant — Ask questions about uploaded documents

### UI Features
- Blue + White government theme
- Glassmorphism cards
- Responsive sidebar navigation
- Top navbar with breadcrumbs
- Framer Motion animations
- Loading skeletons
- Empty states and error states
- Dark mode support
- Mobile responsive

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Routing | React Router v6 |
| Forms | React Hook Form |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Validation | Zod |
| Notifications | Custom Toast System |

## Getting Started

1. Open the app at `http://localhost:5173`
2. Click **"Create one"** to register a new account
3. Fill in your name, email, phone, role, department, designation, and password
4. After successful registration, you'll be automatically logged in and taken to the dashboard

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app runs at `http://localhost:5173`.

## Demo Script

1. **Register** — Click "Create one" on the login page, fill in your details, and create an account
2. **Login** — After registration you'll be logged in automatically. For future visits, sign in with your email and password
2. **Dashboard** — View statistics, charts, recent documents, and activity
3. **Upload** — Go to Upload page, drag files, watch OCR + AI processing stages
4. **Documents** — Browse the document list, filter by department/category/status
5. **Document Details** — Click any document to view OCR text, AI metadata, version history
6. **Search** — Use natural language search ("Show all land documents") or AI Chat Assistant
7. **Approvals** — Review pending documents, approve/reject/request changes with comments
8. **Audit Trail** — View complete activity log with timestamps and IP addresses
9. **Reports** — Generate daily/weekly/monthly reports, export as CSV
10. **User Management** — (Admin only) Create/edit/delete users, assign roles
11. **Settings** — (Admin only) Configure AI, OCR, departments, categories, theme
12. **Logout** — Click profile → Logout

## Project Structure

```
src/
├── components/
│   ├── layout/        # Sidebar, Navbar, Layout, ProtectedRoute
│   ├── shared/        # PageHeader, Badges, EmptyState
│   └── ui/            # Button, Card, Input, Modal, Badge, etc.
├── lib/
│   ├── auth-context.jsx     # Authentication context
│   ├── theme-context.jsx    # Dark/light theme
│   ├── toast-context.jsx    # Toast notifications
│   ├── mock-api.js          # Mock API with localStorage persistence
│   ├── mock-data.js         # Demo data (users, documents, logs)
│   └── utils.js             # Utility functions
├── pages/
│   ├── login.jsx            # Login page
│   ├── forgot-password.jsx  # Password recovery with OTP
│   ├── dashboard.jsx        # Government dashboard
│   ├── upload.jsx           # Drag-and-drop upload with OCR
│   ├── document-list.jsx    # Document table with filters
│   ├── document-details.jsx # Document detail view
│   ├── search.jsx           # Smart search + AI chat
│   ├── approvals.jsx        # Approval workflow
│   ├── audit-trail.jsx      # Activity logs
│   ├── reports.jsx          # Analytics and reports
│   ├── users.jsx            # User management (admin)
│   ├── settings.jsx         # System settings (admin)
│   ├── profile.jsx          # User profile
│   └── not-found.jsx        # 404 page
├── App.jsx                  # Main app with routing
├── main.jsx                 # Entry point
└── index.css                # Global styles + theme
```

## Roles & Permissions

| Feature | Admin | Officer | Verifier | Citizen |
|---------|-------|---------|----------|---------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Upload | ✓ | ✓ | ✗ | ✓ |
| Documents | ✓ | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ | ✓ |
| Approvals | ✓ | ✓ | ✓ | ✗ |
| Audit Trail | ✓ | ✓ | ✓ | ✗ |
| Reports | ✓ | ✓ | ✓ | ✗ |
| User Management | ✓ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✗ | ✗ |
