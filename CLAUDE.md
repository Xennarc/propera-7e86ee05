# Project: Propera

Multi-resort operations management platform. SaaS product with five portals: Guest, Staff, Super Admin, Driver, and Vendor.

## Tech Stack

- **Framework:** React 19, TypeScript 5.8, Vite 5 (SWC)
- **Routing:** React Router DOM v6 (lazy-loaded routes)
- **Styling:** Tailwind CSS 3.4, shadcn/ui (Radix UI primitives), Framer Motion
- **State:** TanStack React Query 5 (server state), React Context (app state)
- **Forms:** React Hook Form + Zod validation
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **i18n:** i18next (English, Chinese)
- **PWA:** vite-plugin-pwa with offline support
- **Testing:** Vitest, Testing Library
- **Charts:** Recharts

## Commands

- `npm run dev` — local dev server (port 8080)
- `npm run build` — production build
- `npm run build:dev` — development build
- `npm run lint` — ESLint
- `npm run preview` — preview production build

## Directory Structure

```
src/
├── App.tsx                  # Main router (451 lines, 200+ routes)
├── main.tsx                 # Bootstrap: PWA, i18n, Helmet
├── index.css                # Global styles (Tailwind + custom)
├── components/              # 383 files in 41 subdirectories
│   ├── ui/                  # shadcn/ui primitives + custom components
│   ├── staff/               # Staff portal (dashboard, requests, room service)
│   ├── guest/               # Guest portal (booking, pre-arrival, feedback)
│   ├── activities/          # Activity sessions, bookings, ops sheets
│   ├── restaurants/         # Dining slots, reservations, menus
│   ├── superadmin/          # Platform admin (resorts, users, flags)
│   ├── department/          # Department planner, resources, compliance
│   ├── transport/           # Driver dispatch, trips, setup
│   ├── branding/            # Resort customization
│   ├── reports/             # Analytics components
│   ├── auth/                # Auth flows
│   ├── loyalty/             # Loyalty programs
│   └── ...                  # 28 more domain directories
├── pages/                   # 158 page files by portal/feature
│   ├── guest/               # Guest portal pages
│   ├── staff/               # Staff operations pages
│   ├── activities/          # Activity management pages
│   ├── restaurants/         # Dining management pages
│   ├── reports/             # Analytics pages
│   ├── settings/            # Configuration pages
│   ├── superadmin/          # Platform admin pages
│   └── ...
├── hooks/                   # 120+ custom hooks
│   ├── useFeatureFlags.ts   # Feature flag access
│   ├── useEffectivePermissions.ts # RBAC resolution
│   ├── driver/              # Driver-specific hooks
│   ├── guest/               # Guest-specific hooks
│   ├── superadmin/          # Super admin hooks
│   ├── transport/           # Transport hooks
│   └── sync/                # Realtime sync hooks
├── contexts/                # React Context providers
│   ├── AuthContext.tsx       # Staff authentication
│   ├── GuestAuthContext.tsx  # Guest auth (room/name/PIN)
│   ├── ResortContext.tsx     # Multi-resort scope
│   ├── DepartmentContext.tsx # Department scope
│   └── GuestRealtimeContext.tsx # Guest realtime updates
├── lib/                     # 45+ utility modules
│   ├── query-client-config.ts    # React Query setup
│   ├── query-keys.ts             # Query key factory
│   ├── booking-service.ts        # Booking CRUD logic
│   ├── booking-validation.ts     # Booking rules (Zod)
│   ├── feature-flag-registry.ts  # Flag definitions
│   ├── demo-seed.ts              # Demo data seeding
│   ├── timezone-utils.ts         # Timezone handling
│   └── departments/              # Department utilities
├── types/                   # TypeScript types
│   ├── database.ts          # Entity types
│   ├── rbac.ts              # Role/permission types
│   └── operations.ts        # Ops types
├── integrations/
│   └── supabase/
│       ├── client.ts        # Supabase client init
│       └── types.ts         # Auto-generated DB types (302KB)
├── providers/
│   └── FeatureFlagsProvider.tsx
├── routes/
│   └── guestRoutes.ts       # Guest route definitions
├── i18n/                    # i18next config + locale JSON
├── config/                  # App configuration
├── utils/                   # Utility functions
└── __tests__/               # Test files
    └── security/            # Tenant isolation tests

supabase/
├── config.toml              # 21 Edge Functions config
├── functions/               # Serverless functions (Deno)
│   ├── process-outbox/      # Event processing (cron: every minute)
│   ├── demo-reset/          # Demo rotation (cron: every 4 days)
│   ├── retention-scheduler/ # Data retention (cron: daily 3am)
│   ├── find-guest-resort/   # Guest lookup (no JWT)
│   ├── send-staff-invite/   # Staff onboarding
│   ├── sign-qr-login/       # QR authentication
│   └── ...                  # 14 more functions
└── migrations/              # 238 SQL migration files
```

## Architecture

### Multi-Portal Routing

Routes are prefix-based in `App.tsx`:
- `/guest/*` — Guest portal (mobile-first)
- `/staff/*` — Staff operations
- `/driver/*` — Driver portal
- `/superadmin/*` — Platform admin
- `/vendor/*` — Vendor bookings
- Public routes: Landing, Pricing, About, Demo

Each portal has its own layout shell (StaffShell, GuestLayout, DriverLayout, etc.) and auth context.

### Context Provider Stack

```
ThemeProvider → TooltipProvider → AuthProvider → ResortProvider → GuestAuthProvider
```

- **AuthContext** — Staff user, profile, global role, resort memberships
- **ResortContext** — Active resort selection, resort-scoped queries
- **GuestAuthContext** — Guest session (room number, last name, PIN)
- **DepartmentContext** — Department-scoped views (nested inside staff)
- **GuestRealtimeContext** — Realtime updates for guest portal

### Data Fetching

- TanStack React Query for all server state
- Centralized query key factory in `src/lib/query-keys.ts`
- Custom hooks per domain: `useGuestsQuery`, `useFeatureFlags`, `useDailyOpsSheet`, etc.
- Optimistic updates with rollback on mutations
- `networkMode: 'offlineFirst'` for PWA support

### Feature Flags

- Registry in `src/lib/feature-flag-registry.ts`
- Stored in Supabase, scoped per resort
- Parent module dependencies (disabling parent disables children)
- `FeatureFlagsProvider` + `useFeatureFlags()` hook
- `FeatureGate` wrapper component for conditional rendering
- Guest flags use RPC (RLS-safe), staff flags use direct queries

### RBAC

**Global roles:** `SUPER_ADMIN`, `STANDARD`
**Resort roles:** `RESORT_ADMIN`, `MANAGER`, `FRONT_OFFICE`, `RESERVATIONS`, `ACTIVITIES`, `FNB`, `TRANSPORT`

- Two-layer access: role-based module access + granular permissions
- `usePermissions()` and `useEffectivePermissions()` hooks
- Permission matrix in `src/config/permission-modules.ts`

### Multi-Tenancy

- All data is resort-scoped via `resort_id`
- ResortContext provides active resort throughout the app
- Supabase RLS enforces tenant isolation at the database level

## Conventions

### Components

- Functional components with TypeScript interfaces for props
- Lazy-loaded pages with `React.lazy()` + `Suspense`
- Domain-organized: `components/{domain}/` mirrors `pages/{domain}/`
- shadcn/ui for all base UI components (`components/ui/`)

### Styling

- Tailwind CSS with `cn()` utility (clsx + tailwind-merge) from `src/lib/utils.ts`
- Custom color system: midnight, lime, blurple, navy, teal, sand, coral, lagoon, sunset, orchid
- Dark mode via `next-themes` (class-based toggle)
- Path alias: `@/*` maps to `src/*`

### Hooks

- `use` prefix, camelCase: `useFeatureFlags`, `useGuestFilters`
- Domain-specific hooks in subdirectories: `hooks/driver/`, `hooks/guest/`
- Server state hooks wrap React Query (`useQuery`, `useMutation`)
- UI hooks for responsive/mobile: `useMobile()`, `useMediaQuery()`, `useKeyboardInset()`

### State Management

- React Query for server state (never store API data in Context)
- React Context for global app state (auth, resort, department)
- Local `useState` for UI-only concerns
- No Redux, Zustand, or other state libraries

### TypeScript

- Loose config (no strict mode, allows implicit any)
- Auto-generated Supabase types in `src/integrations/supabase/types.ts` — do not edit manually
- Custom types in `src/types/` for domain-specific interfaces
- Path alias: `@/*` → `./src/*`

### Error Handling

- `ConnectionErrorBoundary` for network failures
- Per-route error boundaries with fallback UI
- Toast notifications via Sonner
- Platform error logger for debug mode

## Supabase

- **Project ID:** dstxrbmetabgbijjeoyf
- **Client init:** `src/integrations/supabase/client.ts`
- **Types:** Auto-generated at `src/integrations/supabase/types.ts` (do not edit)
- **Edge Functions:** 21 serverless functions in `supabase/functions/`
- **Migrations:** 238 files in `supabase/migrations/`
- **Scheduled functions:** process-outbox (every minute), demo-reset (every 4 days), retention-scheduler (daily 3am)
- **Public endpoints (no JWT):** sitemap, find-guest-resort, provision-demo

## Testing

- **Unit/Integration:** Vitest + Testing Library (jsdom environment)
- **Security tests:** Separate config at `vitest.security.config.ts` (node environment, serial execution)
- **Test files:** `src/**/*.{test,spec}.{ts,tsx}`
- **Setup:** `src/test/setup.ts`

## Known TODOs

See `docs/todo-inventory.md` for tracked stubs, placeholders, and dead code. Key items:
- DiningOpsAdapter returns empty (gated behind feature flag)
- Transport seeding disabled in demo-reset
- Pickup-needed logic placeholder in MasterOpsSheet
- UI consolidation needed: MobileCard vs .guest-card, data-table variants

## Key Domain Entities

- **Resort** — Multi-tenant unit with onboarding status, branding, subscription tier
- **Guest** — Guest record with stay dates, room, pre-arrival preferences
- **Activity / ActivitySession / ActivityBooking** — Activity catalog → scheduled sessions → guest bookings
- **Restaurant / RestaurantSlot / RestaurantBooking** — Dining venues → time slots → reservations
- **Profile / ResortMembership** — Staff user → resort role mapping
- **SubscriptionTier:** ESSENTIAL, PROFESSIONAL, ELITE (controls feature entitlements)
