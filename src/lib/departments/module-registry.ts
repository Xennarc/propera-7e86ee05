/**
 * Module Registry — Single source of truth for department module metadata.
 *
 * Adding a new module = registering it here + optional adapter.
 * Navigation, settings, and permissions all derive from this registry.
 */
import type { LucideIcon } from 'lucide-react';
import type { DepartmentModuleKey, DepartmentBindingType } from '@/types/database';
import {
  CalendarDays,
  LayoutList,
  Inbox,
  ClipboardList,
  Wrench,
  Clock,
  CalendarOff,
  Truck,
  ShieldCheck,
  HeartPulse,
  Users,
  Settings,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

export type ModuleGroup = 'operations' | 'resources' | 'compliance' | 'manage';

export interface ModuleRegistryEntry {
  /** Stable key matching DepartmentModuleKey (or pseudo-key for manage items) */
  key: string;
  /** Human-readable label */
  label: string;
  /** Short description for settings UI */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Route segment appended to /staff/dept/:deptKey/ */
  routeSegment: string;
  /** Group for sidebar section headers and settings grouping */
  group: ModuleGroup;
  /** Which binding types this module requires to be useful (empty = works without bindings) */
  requiredBindings: DepartmentBindingType[];
  /** Whether only managers/admins can see this (true = manager-only) */
  requiresManager: boolean;
  /** Whether this can appear in the mobile bottom nav primary bar */
  supportsMobileNav: boolean;
  /** Whether this is a "real" toggleable module in department_modules (vs pseudo-nav like manage/settings) */
  isToggleable: boolean;
  /** Priority for mobile nav ordering (lower = higher priority) */
  mobileNavPriority: number;
}

// ─── Registry ────────────────────────────────────────────────────

export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  // === Operations ===
  {
    key: 'ops_planner',
    label: 'Planner',
    description: 'Visual calendar planner for sessions, shifts, and resources',
    icon: CalendarDays,
    routeSegment: 'planner',
    group: 'operations',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: true,
    isToggleable: true,
    mobileNavPriority: 10,
  },
  {
    key: 'master_ops_sheet',
    label: 'Master Sheet',
    description: 'Daily overview of all sessions with pax counts and status',
    icon: LayoutList,
    routeSegment: 'master',
    group: 'operations',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: true,
    isToggleable: true,
    mobileNavPriority: 20,
  },
  {
    key: 'ops_inbox',
    label: 'Inbox',
    description: 'Live feed of upcoming sessions with time-based filtering',
    icon: Inbox,
    routeSegment: 'inbox',
    group: 'operations',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: true,
    isToggleable: true,
    mobileNavPriority: 30,
  },
  {
    key: 'session_run_sheet',
    label: 'Session Run Sheet',
    description: 'Per-session manifest with guest details and check-in',
    icon: ClipboardList,
    routeSegment: 'run-sheet',
    group: 'operations',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },

  // === Resources ===
  {
    key: 'resources_assets',
    label: 'Assets',
    description: 'Manage boats, vehicles, and equipment',
    icon: Wrench,
    routeSegment: 'resources/assets',
    group: 'resources',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: true,
    isToggleable: true,
    mobileNavPriority: 40,
  },
  {
    key: 'resources_shifts',
    label: 'Staff Shifts',
    description: 'Manage staff shift assignments',
    icon: Clock,
    routeSegment: 'resources/shifts',
    group: 'resources',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },
  {
    key: 'resources_unavailability',
    label: 'Unavailability',
    description: 'Track asset and staff unavailability',
    icon: CalendarOff,
    routeSegment: 'resources/unavailability',
    group: 'resources',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },
  {
    key: 'pickup_runs',
    label: 'Pickup Runs',
    description: 'Manage guest pickup logistics',
    icon: Truck,
    routeSegment: 'resources/pickups',
    group: 'resources',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },

  // === Compliance ===
  {
    key: 'compliance_verify',
    label: 'Cert Verification',
    description: 'Verify guest certifications and qualifications',
    icon: ShieldCheck,
    routeSegment: 'compliance/verify',
    group: 'compliance',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },
  {
    key: 'compliance_medical',
    label: 'Medical Review',
    description: 'Review guest medical declarations',
    icon: HeartPulse,
    routeSegment: 'compliance/medical',
    group: 'compliance',
    requiredBindings: [],
    requiresManager: false,
    supportsMobileNav: false,
    isToggleable: true,
    mobileNavPriority: 100,
  },

  // === Manage (pseudo-modules — not toggleable, manager-only) ===
  {
    key: '_manage_access',
    label: 'Manage Access',
    description: 'Add, remove, and configure team member access',
    icon: Users,
    routeSegment: 'manage/access',
    group: 'manage',
    requiredBindings: [],
    requiresManager: true,
    supportsMobileNav: false,
    isToggleable: false,
    mobileNavPriority: 100,
  },
  {
    key: '_settings',
    label: 'Settings',
    description: 'Department configuration, modules, and bindings',
    icon: Settings,
    routeSegment: 'settings',
    group: 'manage',
    requiredBindings: [],
    requiresManager: true,
    supportsMobileNav: false,
    isToggleable: false,
    mobileNavPriority: 100,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

/** All groups in display order */
export const REGISTRY_GROUPS: { key: ModuleGroup; label: string }[] = [
  { key: 'operations', label: 'Operations' },
  { key: 'resources', label: 'Resources' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'manage', label: 'Manage' },
];

/** Get only toggleable modules (for settings UI) */
export function getToggleableModules() {
  return MODULE_REGISTRY.filter(m => m.isToggleable);
}

/** Get registry entry by key (returns undefined if not registered) */
export function getModuleEntry(key: string): ModuleRegistryEntry | undefined {
  return MODULE_REGISTRY.find(m => m.key === key);
}

/** Get modules for mobile bottom nav primary bar */
export function getMobileNavModules() {
  return MODULE_REGISTRY
    .filter(m => m.supportsMobileNav)
    .sort((a, b) => a.mobileNavPriority - b.mobileNavPriority);
}

/** Get modules for "More" bottom sheet */
export function getMoreSheetModules() {
  return MODULE_REGISTRY.filter(m => !m.supportsMobileNav || m.requiresManager);
}

/** Get sidebar items grouped */
export function getSidebarGroups() {
  return REGISTRY_GROUPS.map(g => ({
    ...g,
    modules: MODULE_REGISTRY.filter(m => m.group === g.key),
  })).filter(g => g.modules.length > 0);
}

// ─── Binding Type Definitions (for Bindings UI renderer) ────────

export interface BindingTypeDef {
  type: DepartmentBindingType;
  label: string;
  description: string;
  /** RPC or table to fetch available options */
  optionsSource: string;
  /** Column in the options source that has the key */
  optionKeyField: string;
  /** Column in the options source that has the display label */
  optionLabelField: string;
}

export const BINDING_TYPE_DEFS: BindingTypeDef[] = [
  {
    type: 'activity_category',
    label: 'Activity Categories',
    description: 'Which activity categories this department manages',
    optionsSource: 'activity_category_enum',
    optionKeyField: 'value',
    optionLabelField: 'label',
  },
  {
    type: 'restaurant',
    label: 'Restaurants',
    description: 'Which restaurants this department manages',
    optionsSource: 'restaurants',
    optionKeyField: 'id',
    optionLabelField: 'name',
  },
];

export function getBindingTypeDef(type: DepartmentBindingType): BindingTypeDef | undefined {
  return BINDING_TYPE_DEFS.find(d => d.type === type);
}
