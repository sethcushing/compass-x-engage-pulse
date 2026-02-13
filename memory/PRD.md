# Engagement Pulse - Product Requirements Document

## Overview
**Product Name:** Engagement Pulse  
**Purpose:** Internal web app for consulting firms to track weekly engagement health  
**Date Created:** February 13, 2026

## Original Problem Statement
Build an internal web app called "Engagement Pulse" for a consulting firm where:
- Consultants submit weekly pulse updates for their engagements
- Leadership can view engagement health across clients
- Drill into risks/issues/milestones/contacts
- Track RAG status over time

## User Personas

### 1. Consultant
- Assigned to exactly one engagement
- Submits weekly pulse updates
- Views their own engagement details (read-only for milestones, risks, issues)

### 2. Engagement Lead
- Oversees multiple engagements
- Full visibility across all clients/engagements
- Can manage engagement-level objects (milestones, risks, issues, contacts)

### 3. Admin
- Full system access
- Can manage users, clients, engagements
- Can reassign consultants to engagements

## Core Requirements

### Authentication
- Google OAuth via Emergent Auth
- Role-based access control (CONSULTANT, LEAD, ADMIN)
- Session-based authentication with httpOnly cookies

### Data Model
- Users (id, name, email, role, is_active)
- Clients (id, client_name, industry, notes, primary_contact)
- Engagements (id, client_id, engagement_name, code, consultant_user_id, dates, rag_status, health_score)
- WeeklyPulses (id, engagement_id, week_start, rag_status, what_went_well, delivered, issues, roadblocks, plan_next_week)
- Milestones (id, engagement_id, title, due_date, status, completion_percent)
- Risks (id, engagement_id, title, category, probability, impact, mitigation_plan, status)
- Issues (id, engagement_id, title, severity, status, resolution)
- Contacts (id, engagement_id, name, title, email, phone, type)

### Health Score Calculation
- Base: 100
- RAG AMBER: -15
- RAG RED: -35
- Critical Issue: -15 per open
- High Issue: -8 per open
- Medium Issue: -4 per open
- Low Issue: -2 per open
- High/High Risk (open): -10 per
- Missing current week pulse: -10
- Floor: 0

## What's Been Implemented

### Backend (FastAPI + MongoDB)
- [x] All data models and enums
- [x] Google OAuth authentication flow
- [x] Session management with cookies
- [x] CRUD endpoints for all entities
- [x] Health score calculation
- [x] Dashboard summary endpoint
- [x] RAG trend endpoint
- [x] Demo data seeding
- [x] Role-based access control

### Frontend (React + Shadcn UI)
- [x] Landing page with Google OAuth login
- [x] Auth callback handling
- [x] Protected routes with role-based redirects
- [x] Portfolio Dashboard (Lead/Admin view)
  - RAG overview cards
  - Missing pulses indicator
  - Critical issues list
  - High impact risks list
  - Upcoming milestones
  - Engagement cards with filters
- [x] Engagement Detail page
  - Overview tab with RAG trend
  - Pulses tab with history
  - Milestones tab with CRUD
  - Risks tab with CRUD
  - Issues tab with CRUD
  - Contacts tab with CRUD
- [x] Consultant Dashboard
  - Current engagement view
  - Pulse submission prompt
  - Pulse history
  - Read-only milestones/risks/issues
- [x] Weekly Pulse Form
  - RAG status selection
  - All required fields
  - Save draft / Submit functionality
- [x] Admin Setup page
  - Clients CRUD
  - Engagements CRUD
  - Users management
  - Seed demo data button

### Design
- Ocean Executive light theme
- Manrope (headings) + Inter (body) fonts
- Sky/Slate color palette
- Card-based layouts with drill-down panels
- Glass-morphism effects on topbar
- RAG status badges (Green/Amber/Red)
- Health score display

## Prioritized Backlog

### P0 (Critical) - Completed
- [x] Authentication flow
- [x] Dashboard views
- [x] Pulse submission
- [x] CRUD operations

### P1 (High Priority) - Next Phase
- [ ] Email notifications for pulse due dates
- [ ] Bulk pulse submission reminders
- [ ] Export reports to PDF/Excel
- [ ] Advanced filtering on portfolio dashboard

### P2 (Medium Priority)
- [ ] Activity log display in UI
- [ ] Audit trail for all changes
- [ ] Dashboard customization per user
- [ ] Integration with calendar for milestones

### P3 (Low Priority)
- [ ] Mobile-optimized views
- [ ] Dark mode toggle
- [ ] Slack integration for notifications
- [ ] Custom RAG threshold configuration

## Next Action Items
1. Add email/Slack notifications for "Pulse due by Friday"
2. Implement bulk export functionality
3. Add more advanced analytics (trends over time)
4. Consider mobile app or PWA for consultants

## Technical Notes
- Backend: FastAPI on port 8001
- Frontend: React on port 3000
- Database: MongoDB (test_database)
- Authentication: Emergent Google OAuth
- Styling: Tailwind CSS + Shadcn UI components
