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

export interface ModuleAccessLevel {
  id: 'none' | 'view' | 'operate' | 'admin';
  label: string;
  description: string;
  /** Permission keys granted cumulatively at this level */
  permissionKeys: string[];
}

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
  /** Tiered access levels for the module selector */
  accessLevels: ModuleAccessLevel[];
  /** Human-readable labels for each permission key in this module */
  permissionLabels: Record<string, string>;
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
      'portal.view', 'portal.manage', 'portal.links.manage',
      'settings.branding.edit', 'settings.public_links.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot view the guest portal settings', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view portal configuration', permissionKeys: ['portal.view'] },
      { id: 'operate', label: 'Manage', description: 'Can edit portal, branding, and links', permissionKeys: ['portal.view', 'portal.manage', 'portal.links.manage', 'settings.branding.edit', 'settings.public_links.manage'] },
      { id: 'admin', label: 'Full Admin', description: 'Full portal management access', permissionKeys: ['portal.view', 'portal.manage', 'portal.links.manage', 'settings.branding.edit', 'settings.public_links.manage'] },
    ],
    permissionLabels: {
      'portal.view': 'View portal settings',
      'portal.manage': 'Edit portal configuration',
      'portal.links.manage': 'Manage portal links',
      'settings.branding.edit': 'Edit branding settings',
      'settings.public_links.manage': 'Manage public links',
    },
  },
  {
    id: 'guests-stays',
    label: 'Guests & Stays',
    description: 'Guest profiles, stays, and travel party management',
    icon: 'Users',
    permissionKeys: [
      'guests.view', 'guests.create', 'guests.edit', 'guests.delete',
      'guests.import', 'guests.export', 'guests.merge',
      'guests.stays.view', 'guests.stays.create', 'guests.stays.edit', 'guests.stays.delete',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot view guest data', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view guest profiles and stays', permissionKeys: ['guests.view', 'guests.stays.view'] },
      { id: 'operate', label: 'Manage', description: 'Can create, edit guests and stays', permissionKeys: ['guests.view', 'guests.create', 'guests.edit', 'guests.import', 'guests.export', 'guests.stays.view', 'guests.stays.create', 'guests.stays.edit'] },
      { id: 'admin', label: 'Full Admin', description: 'Full access including delete and merge', permissionKeys: ['guests.view', 'guests.create', 'guests.edit', 'guests.delete', 'guests.import', 'guests.export', 'guests.merge', 'guests.stays.view', 'guests.stays.create', 'guests.stays.edit', 'guests.stays.delete'] },
    ],
    permissionLabels: {
      'guests.view': 'View guest profiles',
      'guests.create': 'Create guests',
      'guests.edit': 'Edit guest details',
      'guests.delete': 'Delete guests',
      'guests.import': 'Import guest data',
      'guests.export': 'Export guest data',
      'guests.merge': 'Merge duplicate guests',
      'guests.stays.view': 'View stays',
      'guests.stays.create': 'Create stays',
      'guests.stays.edit': 'Edit stays',
      'guests.stays.delete': 'Delete stays',
    },
  },
  {
    id: 'pre-arrival',
    label: 'Pre-Arrival',
    description: 'Pre-arrival forms, questionnaires, and settings',
    icon: 'ClipboardList',
    permissionKeys: [
      'prearrival.view', 'prearrival.manage', 'prearrival.send', 'settings.prearrival.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access pre-arrival', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view pre-arrival submissions', permissionKeys: ['prearrival.view'] },
      { id: 'operate', label: 'Manage', description: 'Can manage and send pre-arrival forms', permissionKeys: ['prearrival.view', 'prearrival.manage', 'prearrival.send'] },
      { id: 'admin', label: 'Full Admin', description: 'Full pre-arrival access including settings', permissionKeys: ['prearrival.view', 'prearrival.manage', 'prearrival.send', 'settings.prearrival.manage'] },
    ],
    permissionLabels: {
      'prearrival.view': 'View pre-arrival forms',
      'prearrival.manage': 'Manage pre-arrival forms',
      'prearrival.send': 'Send pre-arrival to guests',
      'settings.prearrival.manage': 'Configure pre-arrival settings',
    },
  },
  {
    id: 'guest-requests',
    label: 'Guest Requests',
    description: 'In-stay guest service requests',
    icon: 'MessageSquare',
    permissionKeys: [
      'requests.view', 'requests.create', 'requests.edit',
      'requests.assign', 'requests.resolve', 'requests.delete',
      'requests.categories.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access guest requests', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view guest requests', permissionKeys: ['requests.view'] },
      { id: 'operate', label: 'Manage', description: 'Can create, edit, assign and resolve requests', permissionKeys: ['requests.view', 'requests.create', 'requests.edit', 'requests.assign', 'requests.resolve'] },
      { id: 'admin', label: 'Full Admin', description: 'Full access including delete and category management', permissionKeys: ['requests.view', 'requests.create', 'requests.edit', 'requests.assign', 'requests.resolve', 'requests.delete', 'requests.categories.manage'] },
    ],
    permissionLabels: {
      'requests.view': 'View requests',
      'requests.create': 'Create requests',
      'requests.edit': 'Edit requests',
      'requests.assign': 'Assign requests to staff',
      'requests.resolve': 'Resolve requests',
      'requests.delete': 'Delete requests',
      'requests.categories.manage': 'Manage request categories',
    },
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    description: 'Loyalty programs, tiers, and points',
    icon: 'Award',
    permissionKeys: ['loyalty.view', 'loyalty.manage', 'loyalty.points.adjust'],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access loyalty', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view loyalty data', permissionKeys: ['loyalty.view'] },
      { id: 'operate', label: 'Manage', description: 'Can manage programs and adjust points', permissionKeys: ['loyalty.view', 'loyalty.manage', 'loyalty.points.adjust'] },
      { id: 'admin', label: 'Full Admin', description: 'Full loyalty access', permissionKeys: ['loyalty.view', 'loyalty.manage', 'loyalty.points.adjust'] },
    ],
    permissionLabels: {
      'loyalty.view': 'View loyalty data',
      'loyalty.manage': 'Manage loyalty programs',
      'loyalty.points.adjust': 'Adjust guest points',
    },
  },
  {
    id: 'messaging',
    label: 'Messaging',
    description: 'Guest notifications and communication',
    icon: 'Bell',
    permissionKeys: ['notifications.send'],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Guest Experience',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot send notifications', permissionKeys: [] },
      { id: 'operate', label: 'Send', description: 'Can send guest notifications', permissionKeys: ['notifications.send'] },
    ],
    permissionLabels: {
      'notifications.send': 'Send guest notifications',
    },
  },

  // ── Operations ────────────────────────────────────────────────────────
  {
    id: 'activities',
    label: 'Activities',
    description: 'Activity management, sessions, and bookings',
    icon: 'Activity',
    permissionKeys: [
      'activities.view', 'activities.create', 'activities.edit', 'activities.delete',
      'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.delete',
      'bookings.activity.view', 'bookings.activity.create', 'bookings.activity.edit', 'bookings.activity.cancel',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access activities', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view activities, sessions, and bookings', permissionKeys: ['activities.view', 'sessions.view', 'bookings.activity.view'] },
      { id: 'operate', label: 'Operate', description: 'Can create/edit activities, sessions, and manage bookings', permissionKeys: ['activities.view', 'activities.create', 'activities.edit', 'sessions.view', 'sessions.create', 'sessions.edit', 'bookings.activity.view', 'bookings.activity.create', 'bookings.activity.edit'] },
      { id: 'admin', label: 'Full Admin', description: 'Full access including delete and cancel', permissionKeys: ['activities.view', 'activities.create', 'activities.edit', 'activities.delete', 'sessions.view', 'sessions.create', 'sessions.edit', 'sessions.delete', 'bookings.activity.view', 'bookings.activity.create', 'bookings.activity.edit', 'bookings.activity.cancel'] },
    ],
    permissionLabels: {
      'activities.view': 'View activities',
      'activities.create': 'Create activities',
      'activities.edit': 'Edit activities',
      'activities.delete': 'Delete activities',
      'sessions.view': 'View sessions',
      'sessions.create': 'Create sessions',
      'sessions.edit': 'Edit sessions',
      'sessions.delete': 'Delete sessions',
      'bookings.activity.view': 'View bookings',
      'bookings.activity.create': 'Create bookings',
      'bookings.activity.edit': 'Edit bookings',
      'bookings.activity.cancel': 'Cancel bookings',
    },
  },
  {
    id: 'dining',
    label: 'Dining / In-Villa Dining',
    description: 'Restaurant management, reservations, and slots',
    icon: 'UtensilsCrossed',
    permissionKeys: [
      'restaurants.view', 'restaurants.create', 'restaurants.edit', 'restaurants.delete',
      'slots.view', 'slots.create', 'slots.edit', 'slots.delete',
      'bookings.restaurant.view', 'bookings.restaurant.create', 'bookings.restaurant.edit', 'bookings.restaurant.cancel',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access dining', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view restaurants, slots, and reservations', permissionKeys: ['restaurants.view', 'slots.view', 'bookings.restaurant.view'] },
      { id: 'operate', label: 'Operate', description: 'Can manage restaurants, slots, and reservations', permissionKeys: ['restaurants.view', 'restaurants.create', 'restaurants.edit', 'slots.view', 'slots.create', 'slots.edit', 'bookings.restaurant.view', 'bookings.restaurant.create', 'bookings.restaurant.edit'] },
      { id: 'admin', label: 'Full Admin', description: 'Full access including delete and cancel', permissionKeys: ['restaurants.view', 'restaurants.create', 'restaurants.edit', 'restaurants.delete', 'slots.view', 'slots.create', 'slots.edit', 'slots.delete', 'bookings.restaurant.view', 'bookings.restaurant.create', 'bookings.restaurant.edit', 'bookings.restaurant.cancel'] },
    ],
    permissionLabels: {
      'restaurants.view': 'View restaurants',
      'restaurants.create': 'Create restaurants',
      'restaurants.edit': 'Edit restaurants',
      'restaurants.delete': 'Delete restaurants',
      'slots.view': 'View time slots',
      'slots.create': 'Create time slots',
      'slots.edit': 'Edit time slots',
      'slots.delete': 'Delete time slots',
      'bookings.restaurant.view': 'View reservations',
      'bookings.restaurant.create': 'Create reservations',
      'bookings.restaurant.edit': 'Edit reservations',
      'bookings.restaurant.cancel': 'Cancel reservations',
    },
  },
  {
    id: 'transport',
    label: 'Transport / Buggy',
    description: 'Buggy requests, trips, routes, and fleet management',
    icon: 'Bus',
    permissionKeys: [],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'No transport permissions defined yet', permissionKeys: [] },
    ],
    permissionLabels: {},
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping',
    description: 'Room cleaning schedules and task management',
    icon: 'Brush',
    permissionKeys: [],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'No housekeeping permissions defined yet', permissionKeys: [] },
    ],
    permissionLabels: {},
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Dashboards, reports, and data exports',
    icon: 'BarChart3',
    permissionKeys: ['reports.view', 'reports.export', 'reports.financial.view'],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Operations',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access reports', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view dashboards and reports', permissionKeys: ['reports.view'] },
      { id: 'operate', label: 'View & Export', description: 'Can view and export reports', permissionKeys: ['reports.view', 'reports.export'] },
      { id: 'admin', label: 'Full Admin', description: 'Full access including financial reports', permissionKeys: ['reports.view', 'reports.export', 'reports.financial.view'] },
    ],
    permissionLabels: {
      'reports.view': 'View reports',
      'reports.export': 'Export reports',
      'reports.financial.view': 'View financial reports',
    },
  },

  // ── Staff & Security ──────────────────────────────────────────────────
  {
    id: 'staff-access',
    label: 'Staff & Access',
    description: 'Staff accounts, roles, and permission management',
    icon: 'ShieldCheck',
    permissionKeys: [
      'access.users.view', 'access.users.edit', 'access.users.create', 'access.users.delete',
      'access.roles.view', 'access.roles.edit', 'access.roles.create', 'access.roles.delete',
      'access.permissions.view', 'access.permissions.manage',
    ],
    isSensitive: true,
    isPlatformOnly: false,
    category: 'Staff & Security',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access staff management', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view staff and roles', permissionKeys: ['access.users.view', 'access.roles.view', 'access.permissions.view'] },
      { id: 'operate', label: 'Manage Staff', description: 'Can invite, edit staff, and manage roles', permissionKeys: ['access.users.view', 'access.users.edit', 'access.users.create', 'access.roles.view', 'access.roles.edit', 'access.roles.create', 'access.permissions.view'] },
      { id: 'admin', label: 'Full Admin', description: 'Full staff and permission management', permissionKeys: ['access.users.view', 'access.users.edit', 'access.users.create', 'access.users.delete', 'access.roles.view', 'access.roles.edit', 'access.roles.create', 'access.roles.delete', 'access.permissions.view', 'access.permissions.manage'] },
    ],
    permissionLabels: {
      'access.users.view': 'View staff members',
      'access.users.edit': 'Edit staff profiles',
      'access.users.create': 'Invite new staff',
      'access.users.delete': 'Remove staff members',
      'access.roles.view': 'View roles',
      'access.roles.edit': 'Edit roles',
      'access.roles.create': 'Create roles',
      'access.roles.delete': 'Delete roles',
      'access.permissions.view': 'View permissions',
      'access.permissions.manage': 'Manage permissions',
    },
  },
  {
    id: 'resort-settings',
    label: 'Resort Settings',
    description: 'General resort configuration, pricing, and directory',
    icon: 'Settings',
    permissionKeys: [
      'settings.resort.view', 'settings.resort.edit',
      'settings.pricing.view', 'settings.pricing.edit',
      'settings.directory.manage', 'settings.modules.manage',
    ],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Staff & Security',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access settings', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view resort settings and pricing', permissionKeys: ['settings.resort.view', 'settings.pricing.view'] },
      { id: 'operate', label: 'Manage', description: 'Can edit settings, pricing, and directory', permissionKeys: ['settings.resort.view', 'settings.resort.edit', 'settings.pricing.view', 'settings.pricing.edit', 'settings.directory.manage'] },
      { id: 'admin', label: 'Full Admin', description: 'Full settings access including module config', permissionKeys: ['settings.resort.view', 'settings.resort.edit', 'settings.pricing.view', 'settings.pricing.edit', 'settings.directory.manage', 'settings.modules.manage'] },
    ],
    permissionLabels: {
      'settings.resort.view': 'View resort settings',
      'settings.resort.edit': 'Edit resort settings',
      'settings.pricing.view': 'View pricing',
      'settings.pricing.edit': 'Edit pricing',
      'settings.directory.manage': 'Manage directory',
      'settings.modules.manage': 'Manage feature modules',
    },
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Subscription billing and invoicing',
    icon: 'CreditCard',
    permissionKeys: ['billing.view', 'billing.manage'],
    isSensitive: true,
    isPlatformOnly: false,
    category: 'Staff & Security',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access billing', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view billing and invoices', permissionKeys: ['billing.view'] },
      { id: 'admin', label: 'Full Admin', description: 'Full billing management', permissionKeys: ['billing.view', 'billing.manage'] },
    ],
    permissionLabels: {
      'billing.view': 'View billing',
      'billing.manage': 'Manage billing',
    },
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Third-party service connections',
    icon: 'Plug',
    permissionKeys: ['integrations.view', 'integrations.manage'],
    isSensitive: false,
    isPlatformOnly: false,
    category: 'Staff & Security',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot access integrations', permissionKeys: [] },
      { id: 'view', label: 'View Only', description: 'Can view integration status', permissionKeys: ['integrations.view'] },
      { id: 'admin', label: 'Full Admin', description: 'Can manage integrations', permissionKeys: ['integrations.view', 'integrations.manage'] },
    ],
    permissionLabels: {
      'integrations.view': 'View integrations',
      'integrations.manage': 'Manage integrations',
    },
  },

  // ── Platform ──────────────────────────────────────────────────────────
  {
    id: 'admin-security',
    label: 'Admin / Security',
    description: 'Platform-level admin actions',
    icon: 'ShieldAlert',
    permissionKeys: ['access.users.assign_superadmin'],
    isSensitive: true,
    isPlatformOnly: true,
    category: 'Platform',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'Cannot assign super admin', permissionKeys: [] },
      { id: 'admin', label: 'Full Admin', description: 'Can assign super admin role', permissionKeys: ['access.users.assign_superadmin'] },
    ],
    permissionLabels: {
      'access.users.assign_superadmin': 'Assign Super Admin role',
    },
  },
  {
    id: 'danger-zone',
    label: 'Danger Zone',
    description: 'Destructive platform-critical actions',
    icon: 'AlertTriangle',
    permissionKeys: ['system.demo.convert', 'system.resort.delete'],
    isSensitive: true,
    isPlatformOnly: true,
    category: 'Platform',
    accessLevels: [
      { id: 'none', label: 'No Access', description: 'No destructive actions', permissionKeys: [] },
      { id: 'admin', label: 'Full Admin', description: 'Can perform destructive platform actions', permissionKeys: ['system.demo.convert', 'system.resort.delete'] },
    ],
    permissionLabels: {
      'system.demo.convert': 'Convert demo to production',
      'system.resort.delete': 'Delete resort',
    },
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
 * Determine which access level tier best matches the user's current
 * permissions for a given module. Returns the highest tier where all
 * keys are present.
 */
export function getEffectiveAccessLevel(
  userPermissions: string[],
  moduleId: string
): ModuleAccessLevel | null {
  const mod = _moduleById.get(moduleId);
  if (!mod) return null;

  const userSet = new Set(userPermissions);
  let bestMatch: ModuleAccessLevel | null = null;

  for (const level of mod.accessLevels) {
    const allPresent = level.permissionKeys.every(k => userSet.has(k));
    if (allPresent) {
      bestMatch = level;
    }
  }

  return bestMatch;
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

/**
 * Get detailed customization state by comparing role-only permissions
 * against the user's effective permissions.
 */
export function getModuleCustomizationState(
  rolePermissions: string[],
  effectivePermissions: string[],
  overrideKeys: string[],
  moduleId: string
): 'inherited' | 'customized' | 'restricted' | 'elevated' {
  const mod = _moduleById.get(moduleId);
  if (!mod) return 'inherited';

  const overrideSet = new Set(overrideKeys);
  const moduleOverrides = mod.permissionKeys.filter(k => overrideSet.has(k));

  if (moduleOverrides.length === 0) return 'inherited';

  const roleSet = new Set(rolePermissions);
  const effectiveSet = new Set(effectivePermissions);

  let hasElevated = false;
  let hasRestricted = false;

  for (const key of moduleOverrides) {
    const hadFromRole = roleSet.has(key);
    const hasNow = effectiveSet.has(key);

    if (!hadFromRole && hasNow) hasElevated = true;
    if (hadFromRole && !hasNow) hasRestricted = true;
  }

  if (hasRestricted && hasElevated) return 'customized';
  if (hasRestricted) return 'restricted';
  if (hasElevated) return 'elevated';
  return 'customized';
}

/**
 * Count the number of permission overrides within a module.
 */
export function getModuleOverrideCount(
  overrideKeys: string[],
  moduleId: string
): number {
  const mod = _moduleById.get(moduleId);
  if (!mod) return 0;
  const overrideSet = new Set(overrideKeys);
  return mod.permissionKeys.filter(k => overrideSet.has(k)).length;
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

  if (mod.isPlatformOnly && !isSuperAdmin) return false;
  if (isSuperAdmin) return true;

  const adminSet = new Set(adminPermissions);
  return mod.permissionKeys.every(key => adminSet.has(key));
}

/**
 * Return modules visible to the current admin based on their authority level.
 */
export function getVisibleModules(isSuperAdmin: boolean): ModuleConfig[] {
  return PERMISSION_MODULES.filter(mod => {
    if (mod.isPlatformOnly && !isSuperAdmin) return false;
    return true;
  });
}

/**
 * Return permission keys that don't belong to any defined module.
 */
export function getUncategorizedPermissions(allKeys: string[]): string[] {
  return allKeys.filter(key => !_permToModuleMap.has(key));
}
