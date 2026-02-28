/**
 * Canonical Feature Flag Registry
 * 
 * This is the SINGLE SOURCE OF TRUTH for all official feature flags.
 * New flags must be added here first before they can be used in the system.
 * 
 * Naming convention:
 * - Module flags: enable_<module>
 * - Sub-feature flags: enable_<module>_<subfeature>
 */

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  category: 'core' | 'guest' | 'premium' | 'experimental' | 'danger';
  tier: 'starter' | 'professional' | 'enterprise' | null;
  is_dangerous: boolean;
  scope: 'global' | 'resort';
}

export const FEATURE_FLAG_REGISTRY: FeatureFlagDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CORE MODULE FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Dashboards Module
  {
    key: 'enable_dashboards',
    label: 'Dashboards Module',
    description: 'Master toggle for the Dashboards module. Disabling hides all dashboard-related features.',
    category: 'core',
    tier: null,
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_dashboards_analytics',
    label: 'Dashboard Analytics',
    description: 'Enable analytics widgets on the main dashboard.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_dashboards_realtime',
    label: 'Realtime Dashboard Updates',
    description: 'Enable live-updating data on dashboard widgets.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },

  // Guests Module
  {
    key: 'enable_guests',
    label: 'Guests Module',
    description: 'Master toggle for the Guests module. Disabling hides guest management features.',
    category: 'core',
    tier: null,
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guests_travel_party',
    label: 'Travel Party Management',
    description: 'Allow guests to manage travel party members.',
    category: 'core',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guests_preferences',
    label: 'Guest Preferences',
    description: 'Enable guest preference tracking and management.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guests_history',
    label: 'Guest History',
    description: 'Enable viewing of guest stay and booking history.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guests_pin_management',
    label: 'Guest PIN Management',
    description: 'Allow staff to generate and manage guest login PINs for the guest portal.',
    category: 'core',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guests_prearrival_tab',
    label: 'Guest Pre-Arrival Tab',
    description: 'Show the Pre-Arrival tab on guest detail pages.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },

  // Requests Module
  {
    key: 'enable_requests',
    label: 'Requests Module',
    description: 'Master toggle for the Requests module. Disabling hides all request management.',
    category: 'core',
    tier: null,
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_requests_guest_portal',
    label: 'Guest Request Portal',
    description: 'Allow guests to submit requests via the guest portal.',
    category: 'guest',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_requests_guest_submit',
    label: 'Guest Request Submission',
    description: 'Allow guests to submit service requests via the guest portal catalog.',
    category: 'guest',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_requests_sla_tracking',
    label: 'SLA Tracking',
    description: 'Enable SLA monitoring and alerts for requests.',
    category: 'premium',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_requests_auto_assignment',
    label: 'Auto-Assignment',
    description: 'Automatically assign requests to staff based on rules.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },

  // Transport Module
  {
    key: 'enable_transport',
    label: 'Transport Module',
    description: 'Master toggle for the Transport/Buggy module. Disabling hides all transport features.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_transport_guest_booking',
    label: 'Guest Transport Booking',
    description: 'Allow guests to request buggy pickups via guest portal.',
    category: 'guest',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_transport_routes',
    label: 'Scheduled Routes',
    description: 'Enable scheduled buggy routes with fixed stops.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_transport_realtime',
    label: 'Realtime Transport Tracking',
    description: 'Enable live tracking of buggy locations.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },

  // Pre-Arrival Module
  {
    key: 'enable_prearrival',
    label: 'Pre-Arrival Module',
    description: 'Master toggle for Pre-Arrival features. Disabling hides all pre-arrival workflows.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_prearrival_forms',
    label: 'Pre-Arrival Forms',
    description: 'Allow guests to complete pre-arrival forms.',
    category: 'guest',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_prearrival_preferences',
    label: 'Pre-Arrival Preferences',
    description: 'Enable pre-arrival preference collection.',
    category: 'guest',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },

  // Reports Module
  {
    key: 'enable_reports',
    label: 'Reports Module',
    description: 'Master toggle for the Reports module. Disabling hides all reporting features.',
    category: 'core',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_reports_export',
    label: 'Report Export',
    description: 'Allow exporting reports to CSV/PDF.',
    category: 'premium',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_reports_scheduled',
    label: 'Scheduled Reports',
    description: 'Enable automated scheduled report generation and delivery.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },

  // Loyalty Module
  {
    key: 'enable_loyalty',
    label: 'Loyalty Module',
    description: 'Master toggle for the Loyalty program module. Disabling hides all loyalty features.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_loyalty_points',
    label: 'Loyalty Points',
    description: 'Enable points earning and redemption system.',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_loyalty_tiers',
    label: 'Loyalty Tiers',
    description: 'Enable tiered loyalty program (Silver, Gold, Platinum).',
    category: 'premium',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },

  // Room Service / In-Villa Dining Module
  {
    key: 'enable_room_service',
    label: 'Room Service Module',
    description: 'Master toggle for In-Villa Dining / Room Service. Enables menu browsing, ordering, and order management.',
    category: 'guest',
    tier: 'professional',
    is_dangerous: false,
    scope: 'global',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GUEST PORTAL FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: 'enable_guest_portal',
    label: 'Guest Portal',
    description: 'Master toggle for the entire guest portal. Disabling prevents guest access.',
    category: 'core',
    tier: null,
    is_dangerous: true,
    scope: 'global',
  },
  {
    key: 'enable_guest_activities',
    label: 'Guest Activity Booking',
    description: 'Allow guests to browse and book activities.',
    category: 'guest',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guest_dining',
    label: 'Guest Dining Reservations',
    description: 'Allow guests to make restaurant reservations.',
    category: 'guest',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guest_itinerary',
    label: 'Guest Itinerary',
    description: 'Allow guests to view their booking itinerary.',
    category: 'guest',
    tier: 'starter',
    is_dangerous: false,
    scope: 'global',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPERIMENTAL FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: 'enable_ai_concierge',
    label: 'AI Concierge',
    description: 'Enable AI-powered concierge chat for guests.',
    category: 'experimental',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_predictive_staffing',
    label: 'Predictive Staffing',
    description: 'Enable AI-based staffing recommendations.',
    category: 'experimental',
    tier: 'enterprise',
    is_dangerous: false,
    scope: 'global',
  },
  {
    key: 'enable_guest_push_notifications',
    label: 'Guest Push Notifications',
    description: 'Allow guests to opt in to browser push notifications for booking updates and alerts.',
    category: 'experimental',
    tier: 'professional',
    is_dangerous: false,
    scope: 'resort',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DANGER ZONE FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key: 'enable_maintenance_mode',
    label: 'Maintenance Mode',
    description: 'Put the entire platform into maintenance mode. Only Super Admins can access.',
    category: 'danger',
    tier: null,
    is_dangerous: true,
    scope: 'global',
  },
  {
    key: 'enable_demo_reset',
    label: 'Demo Reset',
    description: 'Allow demo data reset functionality. Use with caution.',
    category: 'danger',
    tier: null,
    is_dangerous: true,
    scope: 'global',
  },
];

/**
 * Get a feature flag definition by key
 */
export function getFlagDefinition(key: string): FeatureFlagDefinition | undefined {
  return FEATURE_FLAG_REGISTRY.find(f => f.key === key);
}

/**
 * Get all flags for a specific category
 */
export function getFlagsByCategory(category: FeatureFlagDefinition['category']): FeatureFlagDefinition[] {
  return FEATURE_FLAG_REGISTRY.filter(f => f.category === category);
}

/**
 * Get all module master flags (flags that start with 'enable_' and have no underscore after the module name)
 */
export function getModuleMasterFlags(): FeatureFlagDefinition[] {
  const moduleKeys = [
    'enable_dashboards',
    'enable_guests',
    'enable_requests',
    'enable_transport',
    'enable_prearrival',
    'enable_reports',
    'enable_loyalty',
    'enable_guest_portal',
  ];
  return FEATURE_FLAG_REGISTRY.filter(f => moduleKeys.includes(f.key));
}
