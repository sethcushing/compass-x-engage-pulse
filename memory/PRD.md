# Engagement Pulse - Product Requirements Document

## Original Problem Statement
Build an internal web app called "Engagement Pulse" for a consulting firm. Consultants submit weekly status updates, and leadership tracks engagement health (RAG status), risks, issues, and milestones. The application derives a `health_score` for each engagement.

## User Personas
- **Consultants**: Submit weekly pulses, manage milestones/risks/issues/contacts/meetings/action items for their engagement
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
- Auto-seeding of 24+ CompassX users on startup
- Role-based route protection (CONSULTANT, LEAD, ADMIN)
- Consultants can CRUD on their own engagement data only

### Pages & Features
1. **Landing Page** - Glassmorphic ocean-themed login
2. **Consultant Dashboard** (`/my-engagement`) - 4-blocker overview, pulse tracking, CRUD for milestones/risks/issues/contacts/meetings/action items
3. **Portfolio Dashboard** (`/portfolio`) - Admin/Lead view with RAG summary, engagement cards
4. **Engagement Detail** (`/engagement/:id`) - Tabbed layout: Overview (4-blocker, RAG trend, health scores), Pulses, Milestones (date change tracking), Meetings, Action Items, Risks, Issues, Contacts
5. **Pulse Form** (`/pulse/:engagementId`) - Weekly pulse submission
6. **Admin Setup** (`/admin`) - Admin management panel

### Meetings Feature (NEW)
- Full CRUD for meetings with types: CLIENT_CALL, INTERNAL_SYNC, STEERING_COMMITTEE, WORKSHOP, REVIEW, OTHER
- Meeting statuses: SCHEDULED, COMPLETED, CANCELLED
- Mark meeting as Complete -> auto-prompts to add action items
- Meetings show in 4-blocker overview

### Action Items Feature (NEW)
- Full CRUD for action items (standalone or linked to meetings)
- Statuses: OPEN, IN_PROGRESS, DONE
- Priorities: LOW, MEDIUM, HIGH
- Shows overdue count in 4-blocker overview
- Action items show in both ConsultantDashboard and EngagementDetail

### Key API Endpoints
- Auth: `/api/auth/login`, `/api/auth/me`, `/api/auth/change-password`
- CRUD: `/api/engagements`, `/api/milestones`, `/api/risks`, `/api/issues`, `/api/contacts`, `/api/pulses`, `/api/clients`, `/api/users`
- **Meetings**: `/api/meetings` (GET, POST), `/api/meetings/{id}` (PUT, DELETE)
- **Action Items**: `/api/action-items` (GET, POST), `/api/action-items/{id}` (PUT, DELETE)
- Milestone date tracking: `/api/milestones/{id}/change-date`
- 4-Blocker: `/api/engagements/{id}/four-blocker` (includes meetings_block and action_items_block)
- Dashboard: `/api/dashboard/summary`, `/api/dashboard/rag-trend/{id}`

## Test Credentials
- **Admin**: seth.cushing@compassx.com / CompassX2026!

## Prioritized Backlog

### P1
- AI-powered summary using Emergent LLM key (endpoint exists but needs API key integration)
- Assign CompassX consultants to actual engagements

### P2
- Stabilize Koyeb deployment (MongoDB connection issues - requires user action on Atlas)
- Refactor ConsultantDashboard.jsx into smaller components

### P3
- Enhanced AI summary with error handling
- Accessibility improvements (aria-describedby for dialogs)
- Engagement Detail page RAG trend visualization enhancements
