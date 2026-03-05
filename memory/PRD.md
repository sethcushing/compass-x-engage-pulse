# Engagement Pulse - Product Requirements Document

## Original Problem Statement
Build an internal web app called "Engagement Pulse" for a consulting firm. Consultants submit weekly status updates, and leadership tracks engagement health (RAG status), risks, issues, and milestones. The application derives a `health_score` for each engagement.

## User Personas
- **Consultants**: Submit weekly pulses, manage milestones/risks/issues/contacts for their engagement
- **Leads**: View portfolio dashboard, drill into engagement details
- **Admins**: Full access to manage clients, engagements, users, and all data

## Core Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Auth**: JWT (email/password) with role-based access
- **Deployment**: Docker (multi-stage) for Koyeb

## What's Been Implemented

### Authentication & Authorization
- JWT token-based auth with email/password
- Auto-seeding of 24 CompassX users on startup
- Role-based route protection (CONSULTANT, LEAD, ADMIN)
- Password change & admin password reset

### Pages & Features
1. **Landing Page** - Glassmorphic ocean-themed login with beachy background
2. **Consultant Dashboard** (`/my-engagement`)
   - 4-blocker overview (Pulse, Milestones, Risks, Issues)
   - Current week's pulse status
   - Full CRUD for milestones, risks, issues, contacts
   - Milestone date change tracking with history dialogs
   - Pulse history
3. **Portfolio Dashboard** (`/portfolio`) - Admin/Lead view
   - RAG status summary (GREEN/AMBER/RED counts)
   - Engagement cards with health scores
   - Client & consultant management
   - Missing pulse tracking
4. **Engagement Detail** (`/engagement/:id`)
   - Overview tab with 4-blocker, RAG trend bar chart, health score breakdown
   - Pulses tab with history
   - Milestones tab with date change tracking (original date lock, change history)
   - Risks tab with full CRUD
   - Issues tab with full CRUD
   - Contacts tab with full CRUD
5. **Pulse Form** (`/pulse/:engagementId`) - Weekly pulse submission
6. **Admin Setup** (`/admin`) - Admin management panel

### Backend Endpoints
- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`
- CRUD: `/api/engagements`, `/api/milestones`, `/api/risks`, `/api/issues`, `/api/contacts`, `/api/pulses`, `/api/clients`, `/api/users`
- Milestone date tracking: `/api/milestones/{id}/change-date`, `/api/milestones/{id}/date-history`
- 4-Blocker: `/api/engagements/{id}/four-blocker`
- Dashboard: `/api/dashboard/summary`, `/api/dashboard/rag-trend/{id}`
- Health: `/api/health`

### Role-Based Permissions (Audited)
- Consultants: Can CRUD milestones/risks/issues/contacts on their OWN engagement only
- Leads/Admins: Full access to all engagements
- Engagement creation: Admin only
- User management: Admin only

### Bugs Fixed
- Fixed ConsultantDashboard API URLs (path-based → query-param-based)
- Fixed `db.pulses` → `db.weekly_pulses` in four-blocker endpoint
- Fixed logger used before definition
- Fixed ContactType enum mismatch (removed STAKEHOLDER)
- Fixed datetime comparison bugs (timezone-naive vs timezone-aware)
- Fixed role permissions for consultant CRUD operations

## Test Credentials
- **Admin**: seth.cushing@compassx.com / CompassX2026!
- **Consultant**: ashley.clark@compassx.com / CompassX2026!

## Deployment
- Dockerfile and koyeb.yaml created
- MongoDB Atlas connection (user: sethcushing, DB: CompassXEngagePulse)
- Note: MongoDB Atlas auth issues remain a deployment blocker (user needs to fix Atlas credentials)

## Prioritized Backlog

### P1
- AI-powered summary using Emergent LLM key (endpoint exists but needs API key integration)
- Assign CompassX consultants to engagements (currently demo users are assigned)

### P2
- Stabilize Koyeb deployment (MongoDB connection issues - requires user action on Atlas)
- Refactor ConsultantDashboard.jsx into smaller components

### P3
- Enhanced AI summary with error handling
- Further Koyeb deployment hardening
- Accessibility improvements (aria-describedby for dialogs)
