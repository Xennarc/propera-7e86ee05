/**
 * Module-first permission grouping layer for Propera.
 *
 * Maps existing atomic permission keys (stored in `permissions` table) into
 * logical product modules for UI grouping. Does NOT alter the underlying
 * permission model — purely additive.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleConfig {
  id: string;
  label: string;
  description: string;
  /** Lucide icon name (string key — resolved by consumer) */
  icon: string;
  /** Atomic permission keys that belong to this module */
  permissionKeys: string[];
  /** If true, the module contains permissions flagged as dangerous */
  isSensitive: boolean;
  /** If true, only Super Admins may view or grant permissions in this module */
  isPlatformOnly: boolean;
  /** UI grouping category for the modules list */
  category: ModuleCategory;
}

export type ModuleCategory =
  | 'Guest Experience'
  | 'Operations'
  | 'Staff & Security'
  | 'Platform';

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

export const PERMISSION_MODULES: ModuleConfig[] = [
  // ── Guest Experience ──────────────────────────────────────────────────
  {
    id: 'guest-portal',
    label: 'Guest Portal Management',
    description: 'Guest-facing portal, branding, and public links',
    icon: 'Globe',
    permissionKeys: [
      'portal.view',
      'portal.manage',
      'portal.links.manage',
      'settings.branding.edit',
      'settings.public_links.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },
  {
    id: 'guests-stays',
    label: 'Guests & Stays',
    description: 'Guest profiles, stays, and travel party management',
    icon: 'Users',
    permissionKeys: [
      'guests.view',
      'guests.create',
      'guests.edit',
      'guests.delete',
      'guests.import',
      'guests.export',
      'guests.merge',
      'guests.stays.view',
      'guests.stays.create',
      'guests.stays.edit',
      'guests.stays.delete',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },
  {
    id: 'pre-arrival',
    label: 'Pre-Arrival',
    description: 'Pre-arrival forms, questionnaires, and settings',
    icon: 'ClipboardList',
    permissionKeys: [
      'prearrival.view',
      'prearrival.manage',
      'prearrival.send',
      'settings.prearrival.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },
  {
    id: 'guest-requests',
    label: 'Guest Requests',
    description: 'In-stay guest service requests',
    icon: 'MessageSquare',
    permissionKeys: [
      'requests.view',
      'requests.create',
      'requests.edit',
      'requests.assign',
      'requests.resolve',
      'requests.delete',
      'requests.categories.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    description: 'Loyalty programs, tiers, and points',
    icon: 'Award',
    permissionKeys: [
      'loyalty.view',
      'loyalty.manage',
      'loyalty.points.adjust',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },
  {
    id: 'messaging',
    label: 'Messaging',
    description: 'Guest notifications and communication',
    icon: 'Bell',
    permissionKeys: [
      'notifications.send',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
  },

  // ── Operations ────────────────────────────────────────────────────────
  {
    id: 'activities',
    label: 'Activities',
    description: 'Activity management, sessions, and bookings',
    icon: 'Activity',
    permissionKeys: [
      'activities.view',
      'activities.create',
      'activities.edit',
      'activities.delete',
      'sessions.view',
      'sessions.create',
      'sessions.edit',
      'sessions.delete',
      'bookings.activity.view',
      'bookings.activity.create',
      'bookings.activity.edit',
      'bookings.activity.cancel',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
  },
  {
    id: 'dining',
    label: 'Dining / In-Villa Dining',
    description: 'Restaurant management, reservations, and slots',
    icon: 'UtensilsCrossed',
    permissionKeys: [
      'restaurants.view',
      'restaurants.create',
      'restaurants.edit',
      'restaurants.delete',
      'slots.view',
      'slots.create',
      'slots.edit',
      'slots.delete',
      'bookings.restaurant.view',
      'bookings.restaurant.create',
      'bookings.restaurant.edit',
      'bookings.restaurant.cancel',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
  },
  {
    id: 'transport',
    label: 'Transport / Buggy',
    description: 'Buggy requests, trips, routes, and fleet management',
    icon: 'Bus',
    permissionKeys: [
      // Placeholder — no atomic permissions exist yet for transport
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping',
    description: 'Room cleaning schedules and task management',
    icon: 'Brush',
    permissionKeys: [
      // Placeholder — no atomic permissions exist yet
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Dashboards, reports, and data exports',
    icon: 'BarChart3',
    permissionKeys: [
      'reports.view',
      'reports.export',
      'reports.financial.view',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
  },

  // ── Staff & Security ──────────────────────────────────────────────────
  {
    id: 'staff-access',
    label: 'Staff & Access',
    description: 'Staff accounts, roles, and permission management',
    icon: 'ShieldCheck',
    permissionKeys: [
      'access.users.view',
      'access.users.edit',
      'access.users.create',
      'access.users.delete',
      'access.roles.view',
      'access.roles.edit',
      'access.roles.create',
      'access.roles.delete',
      'access.permissions.view',
      'access.permissions.manage',
    ],
    isSensitive: true,
    isPlatformOnly: false,
    category: 'Staff & Security',
  },
  {
    id: 'resort-settings',
    label: 'Resort Settings',
    description: 'General resort configuration, pricing, and directory',
    icon: 'Settings',
    permissionKeys: [
      'settings.resort.view',
      'settings.resort.edit',
      'settings.pricing.view',
      'settings.pricing.edit',
      'settings.directory.manage',
      'settings.modules.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Staff & Security',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Subscription billing and invoicing',
    icon: 'CreditCard',
    permissionKeys: [
      'billing.view',
      'billing.manage',
    ],
    isSensitive: true,
    isPlatformOnly: false,
    category: 'Staff & Security',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Third-party service connections',
    icon: 'Plug',
    permissionKeys: [
      'integrations.view',
      'integrations.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Staff & Security',
  },

  // ── Platform ──────────────────────────────────────────────────────────
  {
    id: 'admin-security',
    label: 'Admin / Security',
    description: 'Platform-level admin actions',
    icon: 'ShieldAlert',
    permissionKeys: [
      'access.users.assign_superadmin',
    ],
    isSensitive: true,
    isPlatformOnly: true,
    category: 'Platform',
  },
  {
    id: 'danger-zone',
    label: 'Danger Zone',
    description: 'Destructive platform-critical actions',
    icon: 'AlertTriangle',
    permissionKeys: [
      'system.demo.convert',
      'system.resort.delete',
    ],
    isSensitive: true,
    isPlatformOnly: true,
    category: 'Platform',
  },
];

// ---------------------------------------------------------------------------
// Module categories ordered for UI
// ---------------------------------------------------------------------------

export const MODULE_CATEGORIES: ModuleCategory[] = [
  'Guest Experience',
  'Operations',
  'Staff & Security',
  'Platform',
];

// ---------------------------------------------------------------------------
// Lookup helpers (pre-computed)
// ---------------------------------------------------------------------------

/** Map from permission key → module id for O(1) lookup */
const _permToModuleMap: Map<string, string> = new Map();
const _moduleById: Map<string, ModuleConfig> = new Map();

PERMISSION_MODULES.forEach(mod => {
  _moduleById.set(mod.id, mod);
  mod.permissionKeys.forEach(key => {
    _permToModuleMap.set(key, mod.id);
  });
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Get the module a permission belongs to, or null if uncategorised */
export function getModuleForPermission(key: string): ModuleConfig | null {
  const moduleId = _permToModuleMap.get(key);
  return moduleId ? _moduleById.get(moduleId) ?? null : null;
}

/** Get a module config by its id */
export function getModuleById(moduleId: string): ModuleConfig | null {
  return _moduleById.get(moduleId) ?? null;
}

/** Unique modules for a list of permission keys */
export function getModulesForPermissions(keys: string[]): ModuleConfig[] {
  const seen = new Set<string>();
  const result: ModuleConfig[] = [];
  for (const key of keys) {
    const mid = _permToModuleMap.get(key);
    if (mid && !seen.has(mid)) {
      seen.add(mid);
      const mod = _moduleById.get(mid);
      if (mod) result.push(mod);
    }
  }
  return result;
}

/**
 * Determine effective module access given a set of granted permission keys.
 * 'full'    = user has ALL permissions in the module
 * 'partial' = user has SOME permissions in the module
 * 'none'    = user has NONE
 */
export function getEffectiveModuleAccess(
  userPermissions: string[],
  moduleId: string
): 'full' | 'partial' | 'none' {
  const mod = _moduleById.get(moduleId);
  if (!mod || mod.permissionKeys.length === 0) return 'none';

  const userSet = new Set(userPermissions);
  let count = 0;
  for (const key of mod.permissionKeys) {
    if (userSet.has(key)) count++;
  }

  if (count === 0) return 'none';
  if (count === mod.permissionKeys.length) return 'full';
  return 'partial';
}

/**
 * Determine whether module access is purely inherited from roles or has
 * user-specific overrides.
 */
export function isModuleInheritedOrCustomized(
  rolePermissions: string[],
  overrideKeys: string[],
  moduleId: string
): 'inherited' | 'customized' {
  const mod = _moduleById.get(moduleId);
  if (!mod) return 'inherited';

  const overrideSet = new Set(overrideKeys);
  for (const key of mod.permissionKeys) {
    if (overrideSet.has(key)) return 'customized';
  }
  return 'inherited';
}

/** Check whether a module contains sensitive/dangerous permissions */
export function containsSensitivePermissions(moduleId: string): boolean {
  return _moduleById.get(moduleId)?.isSensitive ?? false;
}

/**
 * Determine whether the acting admin is allowed to grant permissions within a
 * module. Resort Admins cannot grant platform-only modules or permissions they
 * don't themselves hold.
 */
export function canAdminGrantModule(
  isSuperAdmin: boolean,
  adminPermissions: string[],
  moduleId: string
): boolean {
  const mod = _moduleById.get(moduleId);
  if (!mod) return false;

  // Platform-only modules require Super Admin
  if (mod.isPlatformOnly && !isSuperAdmin) return false;

  // Super Admin can always grant
  if (isSuperAdmin) return true;

  // Resort Admin can only grant permissions they themselves have
  const adminSet = new Set(adminPermissions);
  return mod.permissionKeys.every(key => adminSet.has(key));
}

/**
 * Return modules visible to the current admin based on their authority level.
 * Filters out platform-only modules for non-Super-Admins and empty placeholder
 * modules.
 */
export function getVisibleModules(isSuperAdmin: boolean): ModuleConfig[] {
  return PERMISSION_MODULES.filter(mod => {
    if (mod.isPlatformOnly && !isSuperAdmin) return false;
    return true;
  });
}

/**
 * Return permission keys that don't belong to any defined module.
 * Useful for building an "Other / Uncategorized" bucket.
 */
export function getUncategorizedPermissions(allKeys: string[]): string[] {
  return allKeys.filter(key => !_permToModuleMap.has(key));
}
