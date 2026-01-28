
# Update README.md with Propera Features and Flows

## Overview

This plan updates the project's README.md to provide a comprehensive description of Propera - a resort operations management platform. The new README will describe the platform's portals, features, technology stack, and user flows.

---

## Content Structure

### 1. Platform Introduction
- Tagline: "Resort operations. Beautifully organized."
- Brief description of what Propera does: unifying guests, staff, schedules, and bookings into one elegant system

### 2. Key Portals (User Types)
Based on codebase analysis, Propera has **5 distinct portals**:

| Portal | Description | Auth Method |
|--------|-------------|-------------|
| **Guest Portal** | Mobile-first booking and itinerary app for guests | Room/Last name/PIN |
| **Staff Portal** | Operations dashboard for resort teams | Email/Password |
| **Super Admin** | Platform-wide management console | Email/Password (elevated) |
| **Vendor Portal** | External vendor booking management | Access code |
| **Public Marketing** | Landing pages and resort marketing | None (public) |

### 3. Core Features

**Guest Experience**
- Pre-arrival preferences and travel party setup
- Activity and restaurant browsing/booking
- Real-time itinerary and today's schedule
- Service requests (housekeeping, minibar, etc.)
- Loyalty program integration
- Stay feedback submission
- QR code login for frictionless access

**Staff Operations**
- TodayHub dashboard: arrivals, departures, sessions, dining
- Guest management with VIP flags and internal notes
- Activity session management (capacity, waitlists)
- Restaurant slot management and reservations
- Guest requests inbox with SLA tracking
- Pre-arrival dashboard
- Team directory

**Analytics & Reports**
- Activities performance
- Restaurant/dining metrics
- Guest behavior analysis
- Cancellation tracking
- Market segmentation
- Stay feedback reports
- Sales performance

**Settings & Configuration**
- Resort branding (logos, colors)
- Pricing and subscription tiers
- Pre-arrival form configuration
- Requests catalog management
- Public links and QR codes
- Staff permissions and roles

**Super Admin (Platform-Level)**
- Multi-resort command center
- Global user/staff management
- Feature flags
- Health monitoring
- Audit logs
- Support tools

**Vendor Integration**
- Vendor login portal
- Booking acknowledgment workflow
- Completion tracking

### 4. Technology Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM v6
- **Backend**: Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Internationalization**: i18next
- **Charts**: Recharts
- **Animations**: Framer Motion

### 5. Architecture Highlights
- Multi-tenant architecture (resort-scoped data)
- Role-based access control (Global + Resort-level roles)
- Real-time updates via Supabase Realtime
- Mobile-first responsive design
- Lazy-loaded routes for performance
- Error boundaries and connection monitoring

### 6. User Roles

**Global Roles:**
- `SUPER_ADMIN`: Platform-wide access
- `STANDARD`: Resort-scoped access

**Resort Roles:**
- `RESORT_ADMIN`: Full resort management
- `MANAGER`: Operational oversight
- `FRONT_OFFICE`: Guest-facing operations
- `RESERVATIONS`: Booking management
- `ACTIVITIES`: Activity coordination
- `FNB`: Food & Beverage operations

### 7. Key User Flows

**Guest Flow:**
1. Find resort or scan QR code
2. Login with room number + last name + PIN
3. View pre-arrival preferences (if before check-in)
4. Browse activities and restaurants
5. Make bookings
6. Submit service requests
7. View today's schedule
8. Submit stay feedback

**Staff Flow:**
1. Login via staff auth
2. Select resort (if multi-resort access)
3. View TodayHub with live stats
4. Manage guests, bookings, requests
5. Run reports and analytics

---

## File Changes

| File | Action |
|------|--------|
| `README.md` | Replace with comprehensive documentation |

---

## Sample Content Preview

```markdown
# Propera

**Resort operations. Beautifully organized.**

Propera is a comprehensive resort operations management platform that brings guests, teams, schedules, and bookings into one elegant system.

## Features

### Guest Portal
- Mobile-first booking experience
- Pre-arrival preferences and travel party management
- Activity and restaurant reservations
- Real-time itinerary
- Service requests (housekeeping, minibar, etc.)
- Loyalty program integration
- Stay feedback

### Staff Portal  
- TodayHub: Real-time arrivals, departures, sessions, covers
- Guest management with VIP tracking
- Activity session scheduling and capacity management
- Restaurant slot management
- Guest requests inbox with SLA tracking
- Comprehensive reporting and analytics

### Super Admin Console
- Multi-resort command center
- Feature flags and rollouts
- Health monitoring
- Audit logs

## Technology Stack
- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- Supabase (Database, Auth, Edge Functions)
- Framer Motion animations
```

---

## Implementation Notes

- The README will maintain the existing Lovable-specific setup instructions
- Add badges for key technologies
- Include a visual architecture diagram description
- Keep developer-focused sections (setup, deployment) intact
