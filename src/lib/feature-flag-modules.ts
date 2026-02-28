/**
 * Feature Flag Module View Model
 * 
 * Provides derived data structures for organizing flags by module.
 */

import { 
  FEATURE_FLAG_REGISTRY, 
  type FeatureFlagDefinition 
} from './feature-flag-registry';
import type { FeatureFlag } from '@/hooks/useFeatureFlags';

// ═══════════════════════════════════════════════════════════════════════════
// MODULE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ModuleDefinition {
  key: string;           // e.g. 'transport'
  masterFlagKey: string; // e.g. 'enable_transport'
  label: string;
  description: string;
  icon: string;
  childFlagKeys: string[];
}

/**
 * Canonical module definitions with their master flags and children
 */
export const MODULES: ModuleDefinition[] = [
  {
    key: 'dashboards',
    masterFlagKey: 'enable_dashboards',
    label: 'Dashboards',
    description: 'Analytics and overview dashboards',
    icon: 'LayoutDashboard',
    childFlagKeys: ['enable_dashboards_analytics', 'enable_dashboards_realtime'],
  },
  {
    key: 'guests',
    masterFlagKey: 'enable_guests',
    label: 'Guests',
    description: 'Guest management and profiles',
    icon: 'Users',
    childFlagKeys: [
      'enable_guests_travel_party', 
      'enable_guests_preferences', 
      'enable_guests_history',
      'enable_guests_pin_management',
      'enable_guests_prearrival_tab',
    ],
  },
  {
    key: 'requests',
    masterFlagKey: 'enable_requests',
    label: 'Requests',
    description: 'Service request management',
    icon: 'ClipboardList',
    childFlagKeys: [
      'enable_requests_guest_portal',
      'enable_requests_sla_tracking',
      'enable_requests_auto_assignment',
      'enable_requests_guest_submit',
      'enable_requests_guest_multi_select',
      'enable_requests_staff_dispatch',
    ],
  },
  {
    key: 'transport',
    masterFlagKey: 'enable_transport',
    label: 'Transport',
    description: 'Buggy and transport services',
    icon: 'Car',
    childFlagKeys: [
      'enable_transport_guest_booking',
      'enable_transport_routes',
      'enable_transport_realtime',
      'enable_transport_fleet_management',
      'enable_transport_scheduling',
      'enable_transport_fixed_routes',
    ],
  },
  {
    key: 'prearrival',
    masterFlagKey: 'enable_prearrival',
    label: 'Pre-Arrival',
    description: 'Pre-arrival forms and preferences',
    icon: 'Plane',
    childFlagKeys: [
      'enable_prearrival_forms',
      'enable_prearrival_preferences',
      'enable_prearrival_checklist',
      'enable_prearrival_activity_booking',
    ],
  },
  {
    key: 'reports',
    masterFlagKey: 'enable_reports',
    label: 'Reports',
    description: 'Analytics and export reports',
    icon: 'BarChart3',
    childFlagKeys: [
      'enable_reports_export',
      'enable_reports_scheduled',
      'enable_reports_exports',
    ],
  },
  {
    key: 'loyalty',
    masterFlagKey: 'enable_loyalty',
    label: 'Loyalty',
    description: 'Loyalty program management',
    icon: 'Crown',
    childFlagKeys: [
      'enable_loyalty_points',
      'enable_loyalty_tiers',
      'enable_loyalty_manual_adjustments',
    ],
  },
  {
    key: 'guest_portal',
    masterFlagKey: 'enable_guest_portal',
    label: 'Guest Portal',
    description: 'Guest-facing portal access',
    icon: 'Globe',
    childFlagKeys: [
      'enable_guest_activities',
      'enable_guest_dining',
      'enable_guest_itinerary',
    ],
  },
  {
    key: 'room_service',
    masterFlagKey: 'enable_room_service',
    label: 'Room Service',
    description: 'In-Villa Dining ordering and fulfilment',
    icon: 'ClipboardList',
    childFlagKeys: [
      'enable_room_service_guest_ordering',
      'enable_room_service_order_tracking',
      'enable_room_service_modifiers',
      'enable_room_service_runner_view',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME MODULE VIEW MODEL
// ═══════════════════════════════════════════════════════════════════════════

export interface ModuleViewModel {
  definition: ModuleDefinition;
  masterFlag: FeatureFlag | null;
  childFlags: FeatureFlag[];
  enabledChildCount: number;
  totalChildCount: number;
  hasOverrides: boolean;
  overrideCount: number;
}

/**
 * Build module view models from current flags
 */
export function buildModuleViewModels(
  flags: FeatureFlag[],
  isResortScope: boolean
): ModuleViewModel[] {
  const flagMap = new Map(flags.map(f => [f.key, f]));

  return MODULES.map(definition => {
    const masterFlag = flagMap.get(definition.masterFlagKey) || null;
    
    // Find child flags that exist in the database
    const childFlags = definition.childFlagKeys
      .map(key => flagMap.get(key))
      .filter((f): f is FeatureFlag => f !== undefined);
    
    const enabledChildCount = childFlags.filter(f => f.is_enabled).length;
    
    // Count overrides (resort scope only)
    const overrideCount = isResortScope 
      ? childFlags.filter(f => f.resort_id !== null).length + (masterFlag?.resort_id ? 1 : 0)
      : 0;

    return {
      definition,
      masterFlag,
      childFlags,
      enabledChildCount,
      totalChildCount: childFlags.length,
      hasOverrides: overrideCount > 0,
      overrideCount,
    };
  }).filter(m => m.masterFlag !== null); // Only show modules that exist in DB
}

/**
 * Get all flag keys for a module (master + children)
 */
export function getModuleFlagKeys(moduleKey: string): string[] {
  const module = MODULES.find(m => m.key === moduleKey);
  if (!module) return [];
  return [module.masterFlagKey, ...module.childFlagKeys];
}

/**
 * Get module definition by key
 */
export function getModuleDefinition(moduleKey: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.key === moduleKey);
}

/**
 * Get module definition by master flag key
 */
export function getModuleByMasterKey(masterFlagKey: string): ModuleDefinition | undefined {
  return MODULES.find(m => m.masterFlagKey === masterFlagKey);
}
