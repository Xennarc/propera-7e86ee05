# Propera

**Resort operations. Beautifully organized.**

Propera is a comprehensive resort operations management platform that brings guests, teams, schedules, and bookings into one elegant system.

---

## 🏝️ Portals

| Portal | Description | Auth Method |
|--------|-------------|-------------|
| **Guest Portal** | Mobile-first booking and itinerary app | Room/Last name/PIN |
| **Staff Portal** | Operations dashboard for resort teams | Email/Password |
| **Super Admin** | Platform-wide management console | Email/Password (elevated) |
| **Vendor Portal** | External vendor booking management | Access code |
| **Public Marketing** | Landing pages and resort info | None (public) |

---

## ✨ Features

### Guest Experience
- Pre-arrival preferences and travel party setup
- Activity and restaurant browsing/booking
- Real-time itinerary and today's schedule
- Service requests (housekeeping, minibar, etc.)
- Loyalty program integration
- Stay feedback submission
- QR code login for frictionless access

### Staff Operations
- **TodayHub Dashboard**: Arrivals, departures, sessions, dining covers
- Guest management with VIP flags and internal notes
- Activity session management (capacity, waitlists)
- Restaurant slot management and reservations
- Guest requests inbox with SLA tracking
- Pre-arrival dashboard
- Team directory

### Analytics & Reports
- Activities performance metrics
- Restaurant/dining analytics
- Guest behavior analysis
- Cancellation tracking
- Market segmentation
- Stay feedback reports
- Sales performance

### Settings & Configuration
- Resort branding (logos, colors)
- Pricing and subscription tiers
- Pre-arrival form configuration
- Requests catalog management
- Public links and QR codes
- Staff permissions and roles

### Super Admin Console
- Multi-resort command center
- Global user/staff management
- Feature flags and rollouts
- Health monitoring
- Audit logs
- Support tools

### Vendor Integration
- Vendor login portal
- Booking acknowledgment workflow
- Completion tracking

---

## 🔐 User Roles

### Global Roles
| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform-wide access across all resorts |
| `STANDARD` | Resort-scoped access only |

### Resort Roles
| Role | Description |
|------|-------------|
| `RESORT_ADMIN` | Full resort management |
| `MANAGER` | Operational oversight |
| `FRONT_OFFICE` | Guest-facing operations |
| `RESERVATIONS` | Booking management |
| `ACTIVITIES` | Activity coordination |
| `FNB` | Food & Beverage operations |

---

## 🚀 User Flows

### Guest Flow
1. Find resort or scan QR code
2. Login with room number + last name + PIN
3. View pre-arrival preferences (if before check-in)
4. Browse activities and restaurants
5. Make bookings
6. Submit service requests
7. View today's schedule
8. Submit stay feedback

### Staff Flow
1. Login via staff auth
2. Select resort (if multi-resort access)
3. View TodayHub with live stats
4. Manage guests, bookings, requests
5. Run reports and analytics

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State Management** | TanStack Query (React Query) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase (Postgres, Auth, Edge Functions, Realtime) |
| **Internationalization** | i18next |
| **Charts** | Recharts |
| **Animations** | Framer Motion |

---

## 🏗️ Architecture Highlights

- **Multi-tenant architecture** with resort-scoped data isolation
- **Role-based access control (RBAC)** with global + resort-level roles
- **Real-time updates** via Supabase Realtime
- **Mobile-first responsive design**
- **Lazy-loaded routes** for performance
- **Error boundaries** and connection monitoring

---

## 💻 Development

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm i

# Start development server
npm run dev
```

---

## 🌐 Deployment

This project is deployed via [Lovable](https://lovable.dev/projects/61607588-9c4c-4c1b-9efd-4fef90ed06a5).

To publish: **Share → Publish**

To connect a custom domain: **Project → Settings → Domains → Connect Domain**

---

## 📚 Resources

- [Lovable Documentation](https://docs.lovable.dev)
- [Custom Domain Setup](https://docs.lovable.dev/features/custom-domain#custom-domain)
