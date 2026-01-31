# Feature Flag Route Map

> **Purpose**: Reference document mapping modules to routes, navigation items, and command bar actions for feature flag gating.
>
> **Generated**: Phase 0 Preflight Audit
>
> **Source Files**:
> - Router: `src/App.tsx`
> - Staff Sidebar: `src/components/layout/AppSidebar.tsx`
> - Staff Mobile Nav: `src/components/layout/MobileBottomNav.tsx`
> - Staff Command Bar: `src/components/staff/StaffCommandBar.tsx`
> - Super Admin Command Bar: `src/components/superadmin/CommandBar.tsx`
> - Guest Layout/Nav: `src/components/guest/GuestLayout.tsx`
> - Tier Features: `src/lib/tier-features.ts`

---

## Staff Portal Modules

### 1. Dashboard Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/dashboard` | None (all roles) |
| Sidebar | Dashboard | `resortRoles: null` |
| Mobile Nav | Home | `resortRoles: null` |
| CommandBar | Dashboard | Always visible |

### 2. Today's Opportunities Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/today` | None (lazy loaded) |
| Sidebar | Today's Opportunities | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']`, `tierFeature: 'todays_opportunities'` |
| CommandBar | Today's Operations | Always visible |

### 3. Guests Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/guests` | None |
| Route | `/staff/guests/:id` | None (detail page) |
| Sidebar | Guests | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']` |
| Mobile Nav | Guests | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']` |
| CommandBar | Guests | Always visible |
| CommandBar | Add Guest | Quick action |

**Sub-features to gate:**
- Guest detail tabs (360 profile, loyalty, history)
- CSV import (`tierFeature: 'guest_management_csv_import'`)
- PIN management

### 4. Guest Requests Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/guest-requests` | None |
| Route | `/staff/requests-dashboard` | None |
| Sidebar | Guest Requests | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB']`, `tierFeature: 'guest_management_guest_requests'` |
| CommandBar | Guest Requests | Always visible |

### 5. Pre-Arrival Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/prearrival` | None |
| Route | `/staff/settings/prearrival` | None (settings) |
| Sidebar | Pre-Arrival | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']` |
| Mobile Nav (More) | Pre-Arrival | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'RESERVATIONS']`, `tierFeature: 'pre_arrival_links'` |
| CommandBar | Pre-Arrival | Always visible |
| CommandBar | Pre-Arrival Settings | Always visible |

### 6. Activities Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/activities` | None |
| Route | `/staff/activities/sessions` | None |
| Route | `/staff/activities/sessions/new` | None |
| Route | `/staff/activities/sessions/:id` | None (detail) |
| Route | `/staff/activities/cheatsheet` | None |
| Sidebar | Activities | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']` |
| Sidebar | Sessions | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']` |
| Sidebar | Cheat Sheet | `resortRoles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']`, `tierFeature: 'activities_cheatsheet'` |
| Mobile Nav | Activities | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']` |
| CommandBar | Activities | Always visible |
| CommandBar | Activity Sessions | Always visible |
| CommandBar | New Session | Quick action |

### 7. Restaurants Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/restaurants` | None |
| Route | `/staff/restaurants/slots` | None |
| Route | `/staff/restaurants/slots/new` | None |
| Route | `/staff/restaurants/slots/:id` | None (detail) |
| Sidebar | Restaurants | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']` |
| Sidebar | Time Slots | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']` |
| Mobile Nav | Dining | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']` |
| CommandBar | Restaurants | Always visible |
| CommandBar | Time Slots | Always visible |
| CommandBar | New Time Slot | Quick action |

### 8. Transport Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/transport` | None |
| Sidebar | (Not in sidebar) | N/A |
| CommandBar | (Not in command bar) | N/A |

**Note**: Transport is currently accessible via route but not exposed in main navigation.

### 9. Reports Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/reports` | None |
| Route | `/staff/reports/sales` | None |
| Route | `/staff/reports/activities` | None |
| Route | `/staff/reports/restaurants` | None |
| Route | `/staff/reports/cancellations` | None |
| Route | `/staff/reports/guests` | None |
| Route | `/staff/reports/guest-behaviour` | None |
| Route | `/staff/reports/market` | None |
| Route | `/staff/reports/stay-feedback` | None |
| Sidebar | Overview | `resortRoles: ['RESORT_ADMIN', 'MANAGER']` |
| Sidebar | Activities | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'ACTIVITIES']`, `tierFeature: 'reports_activities'` |
| Sidebar | Restaurants | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FNB']`, `tierFeature: 'reports_restaurants'` |
| Sidebar | Cancellations | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']`, `tierFeature: 'reports_cancellations'` |
| Sidebar | Guests | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']`, `tierFeature: 'reports_guests'` |
| Sidebar | Guest Behaviour | `resortRoles: ['RESORT_ADMIN', 'MANAGER']`, `tierFeature: 'reports_guests'` |
| Sidebar | Market | `resortRoles: ['RESORT_ADMIN', 'MANAGER']`, `tierFeature: 'reports_guests'` |
| Mobile Nav (More) | Reports | `resortRoles: ['RESORT_ADMIN', 'MANAGER']` |
| CommandBar | Reports | Always visible |
| CommandBar | Sales Report | Always visible |
| CommandBar | Cancellations Report | Always visible |
| CommandBar | Stay Feedback Report | Always visible |

### 10. Loyalty Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/loyalty` | None |
| Route | `/staff/loyalty/program` | None |
| Route | `/staff/loyalty/tiers` | None |
| Route | `/staff/loyalty/members/:id` | None (detail) |
| Sidebar | Members | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']`, `tierFeature: 'loyalty_program'` |
| Sidebar | Program Settings | `resortRoles: ['RESORT_ADMIN']`, `tierFeature: 'loyalty_program'` |
| Sidebar | Tiers | `resortRoles: ['RESORT_ADMIN']`, `tierFeature: 'loyalty_program'` |
| Mobile Nav (More) | Loyalty | `resortRoles: ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']`, `tierFeature: 'loyalty_member_management'` |
| CommandBar | (Not present) | N/A |

### 11. Vendors Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/vendors` | None |
| Route | `/staff/vendors/attention` | None |
| Route | `/staff/vendors/:vendorId` | None (detail) |
| Sidebar | (Not in sidebar) | N/A |
| CommandBar | (Not present) | N/A |

### 12. Settings Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/settings` | None |
| Route | `/staff/settings/users` | None |
| Route | `/staff/settings/resorts` | None |
| Route | `/staff/settings/resources` | None |
| Route | `/staff/settings/resort-staff` | None |
| Route | `/staff/settings/booking-health` | None |
| Route | `/staff/settings/permissions` | None |
| Route | `/staff/settings/import/guests` | None |
| Route | `/staff/settings/public-links` | None |
| Route | `/staff/settings/branding` | None |
| Route | `/staff/settings/pricing` | None |
| Route | `/staff/settings/subscriptions` | None |
| Route | `/staff/settings/directory` | None |
| Route | `/staff/settings/prearrival` | None |
| Route | `/staff/settings/access` | None |
| Route | `/staff/settings/requests` | None |
| Route | `/staff/settings/modules` | None |
| Sidebar | Resort Staff | `isSuperAdmin() || currentResortRole === 'RESORT_ADMIN'` |
| Sidebar | Branding | `isSuperAdmin() || currentResortRole === 'RESORT_ADMIN'` |
| Sidebar | Resort Directory | `isSuperAdmin() || currentResortRole === 'RESORT_ADMIN' || currentResortRole === 'MANAGER'` |
| Sidebar | Resorts | `isSuperAdmin()` only |
| Sidebar | Subscriptions | `isSuperAdmin()` only |
| Sidebar | Settings | All roles |
| Mobile Nav (More) | Settings | `resortRoles: ['RESORT_ADMIN']` |
| CommandBar | Settings | Always visible |

### 13. Notifications Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/notifications` | None |
| Mobile Nav (More) | Notifications | `resortRoles: null` |
| CommandBar | Notifications | Always visible |

### 14. Team Directory Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/staff/team` | None |
| Sidebar | Team Directory | `resortRoles: null` |
| Mobile Nav (More) | Team | `resortRoles: null` |

---

## Guest Portal Modules

### 1. Guest Home
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest` | GuestLayout auth |
| Bottom Nav | Home | Always visible |

### 2. Guest Activities
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/activities` | None |
| Route | `/guest/activities/catalogue` | None |
| Route | `/guest/activities/sessions` | None |
| Route | `/guest/activities/book/:sessionId` | None |
| Route | `/guest/activities/:activityId` | None |
| Bottom Nav | Activities | Always visible |

### 3. Guest Restaurants
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/restaurants` | None |
| Route | `/guest/restaurants/book/:slotId` | None |
| Bottom Nav | (Not in bottom nav) | N/A |

### 4. Guest Bookings
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/bookings` | None |
| Bottom Nav | Bookings | Always visible |

### 5. Guest Requests Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/requests` | None |
| Route | `/guest/requests/my` | None |
| Bottom Nav | Requests | `restrictPrearrival: true` (shows lock icon for pre-arrival guests) |

### 6. Guest Transport Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/buggy` | None |
| Route | `/guest/my-rides` | None |
| Bottom Nav | (Not in bottom nav) | N/A |

### 7. Guest Loyalty Module
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/loyalty` | None |
| Bottom Nav | Loyalty | Conditionally added based on `loyalty_programs.is_enabled` |

### 8. Guest Profile & Settings
| Type | Path / Item | Current Gating |
|------|-------------|----------------|
| Route | `/guest/profile` | None |
| Route | `/guest/travel-party` | None |
| Route | `/guest/notifications` | None |
| Route | `/guest/feedback` | None |

---

## Super Admin Portal

### Routes (all under `/superadmin`)
| Route | Component | Notes |
|-------|-----------|-------|
| `/superadmin` | CommandCenter | Index/dashboard |
| `/superadmin/resorts` | ResortsManagementPage | |
| `/superadmin/resorts/:resortId` | ResortDetailPage | Detail |
| `/superadmin/users` | GlobalUsersPage | |
| `/superadmin/staff` | GlobalStaffPage | |
| `/superadmin/feature-flags` | FeatureFlagsPage | |
| `/superadmin/health` | HealthMonitoringPage | |
| `/superadmin/audit` | AuditLogsPage | |
| `/superadmin/support` | SupportToolsPage | |
| `/superadmin/transport-qa` | TransportQAPage | |

### Super Admin Command Bar Actions
Located in: `src/components/superadmin/CommandBar.tsx`

| Action | URL | Keywords |
|--------|-----|----------|
| Open Command Center | `/superadmin` | dashboard home |
| Manage All Resorts | `/superadmin/resorts` | resorts |
| View Users & Access | `/superadmin/users` | users staff |
| Feature Flags | `/superadmin/feature-flags` | flags toggles |
| Health Monitoring | `/superadmin/health` | health errors |
| Audit Log | `/superadmin/audit` | audit logs history |
| Support Tools | `/superadmin/support` | support view-as debug |

---

## Vendor Portal

| Route | Component | Notes |
|-------|-----------|-------|
| `/vendor/login` | VendorLogin | Public |
| `/vendor/bookings` | VendorBookings | Auth required |

---

## Tier Features Reference

From `src/lib/tier-features.ts`:

### ESSENTIAL (Base tier)
- `guest_portal_basic`, `guest_portal_cancellation`
- `guest_management_basic`, `guest_management_pin`
- `activities_basic`, `restaurants_basic`
- `reports_basic`, `settings_basic`, `notifications_in_app`

### PROFESSIONAL
- `guest_portal_modification`, `guest_portal_notifications`, `guest_portal_feedback`
- `guest_portal_multi_language`, `guest_portal_pre_arrival`, `guest_portal_branding`
- `guest_management_csv_import`, `guest_management_loyalty`, `guest_management_360_profile`
- `guest_management_guest_requests`
- `activities_recurring`, `activities_closures`, `activities_resources`
- `activities_content_enrichment`, `activities_cheatsheet`
- `restaurants_recurring`, `restaurants_closures`, `restaurants_opening_hours`
- `todays_opportunities`, `pre_arrival_links`, `in_stay_suggestions`, `booking_source_tracking`
- `reports_activities`, `reports_restaurants`, `reports_cancellations`
- `reports_guests`, `reports_feedback`, `reports_csv_export`
- `settings_pricing_charges`, `settings_staff_management`, `settings_staff_invitations`
- `notifications_realtime`

### ELITE
- `guest_portal_ai_concierge`, `guest_portal_loyalty`
- `loyalty_program`, `loyalty_tiers`, `loyalty_earn_rules`, `loyalty_rewards`, `loyalty_member_management`
- `reports_sales_performance`, `reports_ai_insights`, `reports_trend_analysis`
- `reports_day_of_week_patterns`, `reports_lead_time_analysis`
- `settings_booking_health`

---

## Key Observations for Phase 1+

1. **Routes have no route-level gating** - All staff routes are accessible if user passes `StaffShell` auth. Gating is only at nav/sidebar level.

2. **Sidebar uses dual gating** - Both `resortRoles` (role-based) and `tierFeature` (subscription-based) via `useTierAccess`.

3. **Mobile nav mirrors sidebar** - `MobileBottomNav` uses same `canViewNavItem` hook from `useNavAccess`.

4. **Command bars lack tier gating** - `StaffCommandBar` and `CommandBar` show all items regardless of tier.

5. **Guest portal uses runtime checks** - Loyalty nav item added conditionally based on DB query, not tier config.

6. **Deep links ungated** - Detail pages (`:id` routes) inherit parent module access but have no explicit checks.

7. **Transport module orphaned** - Route exists but no navigation entry in sidebar or command bar.

8. **Settings fragmented** - Multiple sub-routes with inline role checks, not centralized.

---

## Recommended Feature Flag Keys (for Phase 1)

Based on module groupings above:

| Flag Key | Scope | Controls |
|----------|-------|----------|
| `module_todays_opportunities` | Resort | Today's Opportunities page + nav |
| `module_prearrival` | Resort | Pre-Arrival dashboard + settings |
| `module_guest_requests` | Resort | Guest Requests inbox + dashboard |
| `module_transport` | Resort | Transport page (staff + guest) |
| `module_loyalty` | Resort | Loyalty pages (staff + guest) |
| `module_reports_advanced` | Resort | Advanced reports (sales, AI insights) |
| `module_vendors` | Resort | Vendor management pages |
| `guest_requests_enabled` | Resort | Guest portal requests feature |
| `guest_transport_enabled` | Resort | Guest portal buggy/rides feature |
| `guest_loyalty_enabled` | Resort | Guest portal loyalty feature |
