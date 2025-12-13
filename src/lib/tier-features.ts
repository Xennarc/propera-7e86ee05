// Tier-based feature access configuration for Propera

export type SubscriptionTier = 'ESSENTIAL' | 'PROFESSIONAL' | 'ELITE';

// All features that can be tier-gated
export type TierFeature =
  // Guest Portal
  | 'guest_portal_basic'
  | 'guest_portal_cancellation'
  | 'guest_portal_modification'
  | 'guest_portal_notifications'
  | 'guest_portal_feedback'
  | 'guest_portal_multi_language'
  | 'guest_portal_pre_arrival'
  | 'guest_portal_branding'
  | 'guest_portal_ai_concierge'
  | 'guest_portal_loyalty'
  // Staff Console - Guest Management
  | 'guest_management_basic'
  | 'guest_management_pin'
  | 'guest_management_csv_import'
  | 'guest_management_loyalty'
  | 'guest_management_360_profile'
  | 'guest_management_guest_requests'
  // Loyalty Program (Elite only)
  | 'loyalty_program'
  | 'loyalty_tiers'
  | 'loyalty_earn_rules'
  | 'loyalty_rewards'
  | 'loyalty_member_management'
  // Staff Console - Activities
  | 'activities_basic'
  | 'activities_recurring'
  | 'activities_closures'
  | 'activities_resources'
  | 'activities_content_enrichment'
  | 'activities_cheatsheet'
  // Staff Console - Restaurants
  | 'restaurants_basic'
  | 'restaurants_recurring'
  | 'restaurants_closures'
  | 'restaurants_opening_hours'
  // Operations & Upsell
  | 'todays_opportunities'
  | 'pre_arrival_links'
  | 'in_stay_suggestions'
  | 'booking_source_tracking'
  // Reports & Analytics
  | 'reports_basic'
  | 'reports_activities'
  | 'reports_restaurants'
  | 'reports_cancellations'
  | 'reports_guests'
  | 'reports_feedback'
  | 'reports_sales_performance'
  | 'reports_ai_insights'
  | 'reports_csv_export'
  // Settings
  | 'settings_basic'
  | 'settings_pricing_charges'
  | 'settings_staff_management'
  | 'settings_staff_invitations'
  | 'settings_booking_health'
  // Notifications
  | 'notifications_in_app'
  | 'notifications_realtime';

// Feature to minimum tier mapping
// If a feature is not listed, it defaults to ESSENTIAL (available to all)
const FEATURE_TIER_MAP: Partial<Record<TierFeature, SubscriptionTier>> = {
  // ESSENTIAL - All basic features (default)
  guest_portal_basic: 'ESSENTIAL',
  guest_portal_cancellation: 'ESSENTIAL',
  guest_management_basic: 'ESSENTIAL',
  guest_management_pin: 'ESSENTIAL',
  activities_basic: 'ESSENTIAL',
  restaurants_basic: 'ESSENTIAL',
  reports_basic: 'ESSENTIAL',
  settings_basic: 'ESSENTIAL',
  notifications_in_app: 'ESSENTIAL',

  // PROFESSIONAL - Enhanced features
  guest_portal_modification: 'PROFESSIONAL',
  guest_portal_notifications: 'PROFESSIONAL',
  guest_portal_feedback: 'PROFESSIONAL',
  guest_portal_multi_language: 'PROFESSIONAL',
  guest_portal_pre_arrival: 'PROFESSIONAL',
  guest_portal_branding: 'PROFESSIONAL',
  guest_management_csv_import: 'PROFESSIONAL',
  guest_management_loyalty: 'PROFESSIONAL',
  guest_management_360_profile: 'PROFESSIONAL',
  guest_management_guest_requests: 'PROFESSIONAL',
  activities_recurring: 'PROFESSIONAL',
  activities_closures: 'PROFESSIONAL',
  activities_resources: 'PROFESSIONAL',
  activities_content_enrichment: 'PROFESSIONAL',
  activities_cheatsheet: 'PROFESSIONAL',
  restaurants_recurring: 'PROFESSIONAL',
  restaurants_closures: 'PROFESSIONAL',
  restaurants_opening_hours: 'PROFESSIONAL',
  todays_opportunities: 'PROFESSIONAL',
  pre_arrival_links: 'PROFESSIONAL',
  in_stay_suggestions: 'PROFESSIONAL',
  booking_source_tracking: 'PROFESSIONAL',
  reports_activities: 'PROFESSIONAL',
  reports_restaurants: 'PROFESSIONAL',
  reports_cancellations: 'PROFESSIONAL',
  reports_guests: 'PROFESSIONAL',
  reports_feedback: 'PROFESSIONAL',
  reports_csv_export: 'PROFESSIONAL',
  settings_pricing_charges: 'PROFESSIONAL',
  settings_staff_management: 'PROFESSIONAL',
  settings_staff_invitations: 'PROFESSIONAL',
  notifications_realtime: 'PROFESSIONAL',

  // ELITE - Premium features
  guest_portal_ai_concierge: 'ELITE',
  guest_portal_loyalty: 'ELITE',
  reports_sales_performance: 'ELITE',
  reports_ai_insights: 'ELITE',
  settings_booking_health: 'ELITE',
  loyalty_program: 'ELITE',
  loyalty_tiers: 'ELITE',
  loyalty_earn_rules: 'ELITE',
  loyalty_rewards: 'ELITE',
  loyalty_member_management: 'ELITE',
};

// Tier hierarchy for comparison
const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  ESSENTIAL: 1,
  PROFESSIONAL: 2,
  ELITE: 3,
};

/**
 * Get the minimum tier required for a feature
 */
export function getFeatureTier(feature: TierFeature): SubscriptionTier {
  return FEATURE_TIER_MAP[feature] ?? 'ESSENTIAL';
}

/**
 * Check if a tier has access to a feature
 */
export function tierHasFeature(tier: SubscriptionTier, feature: TierFeature): boolean {
  const requiredTier = getFeatureTier(feature);
  return TIER_HIERARCHY[tier] >= TIER_HIERARCHY[requiredTier];
}

/**
 * Get the upgrade tier needed for a feature (returns null if already has access)
 */
export function getUpgradeTierForFeature(
  currentTier: SubscriptionTier,
  feature: TierFeature
): SubscriptionTier | null {
  const requiredTier = getFeatureTier(feature);
  if (TIER_HIERARCHY[currentTier] >= TIER_HIERARCHY[requiredTier]) {
    return null;
  }
  return requiredTier;
}

/**
 * Get all features available at a specific tier
 */
export function getFeaturesForTier(tier: SubscriptionTier): TierFeature[] {
  const allFeatures = Object.keys(FEATURE_TIER_MAP) as TierFeature[];
  return allFeatures.filter((feature) => tierHasFeature(tier, feature));
}

/**
 * Get tier display information
 */
export function getTierInfo(tier: SubscriptionTier): {
  name: string;
  description: string;
  color: string;
} {
  switch (tier) {
    case 'ESSENTIAL':
      return {
        name: 'Essential',
        description: 'Core booking and guest management',
        color: 'bg-slate-500',
      };
    case 'PROFESSIONAL':
      return {
        name: 'Professional',
        description: 'Advanced operations and analytics',
        color: 'bg-teal-500',
      };
    case 'ELITE':
      return {
        name: 'Elite',
        description: 'AI-powered insights and premium features',
        color: 'bg-amber-500',
      };
  }
}

/**
 * Feature category groupings for UI display
 */
export const FEATURE_CATEGORIES = {
  'Guest Portal': [
    'guest_portal_basic',
    'guest_portal_cancellation',
    'guest_portal_modification',
    'guest_portal_notifications',
    'guest_portal_feedback',
    'guest_portal_multi_language',
    'guest_portal_pre_arrival',
    'guest_portal_branding',
    'guest_portal_ai_concierge',
  ],
  'Guest Management': [
    'guest_management_basic',
    'guest_management_pin',
    'guest_management_csv_import',
    'guest_management_loyalty',
    'guest_management_360_profile',
    'guest_management_guest_requests',
  ],
  'Activities': [
    'activities_basic',
    'activities_recurring',
    'activities_closures',
    'activities_resources',
    'activities_content_enrichment',
    'activities_cheatsheet',
  ],
  'Restaurants': [
    'restaurants_basic',
    'restaurants_recurring',
    'restaurants_closures',
    'restaurants_opening_hours',
  ],
  'Operations & Upsell': [
    'todays_opportunities',
    'pre_arrival_links',
    'in_stay_suggestions',
    'booking_source_tracking',
  ],
  'Reports & Analytics': [
    'reports_basic',
    'reports_activities',
    'reports_restaurants',
    'reports_cancellations',
    'reports_guests',
    'reports_feedback',
    'reports_sales_performance',
    'reports_ai_insights',
    'reports_csv_export',
  ],
  'Settings': [
    'settings_basic',
    'settings_pricing_charges',
    'settings_staff_management',
    'settings_staff_invitations',
    'settings_booking_health',
  ],
  'Notifications': ['notifications_in_app', 'notifications_realtime'],
} as const;

/**
 * Human-readable feature names
 */
export const FEATURE_NAMES: Record<TierFeature, string> = {
  guest_portal_basic: 'Guest Portal Access',
  guest_portal_cancellation: 'Booking Cancellation',
  guest_portal_modification: 'Booking Modification',
  guest_portal_notifications: 'Guest Notifications',
  guest_portal_feedback: 'Stay Feedback Collection',
  guest_portal_multi_language: 'Multi-Language Support',
  guest_portal_pre_arrival: 'Pre-Arrival Booking',
  guest_portal_branding: 'Custom Branding',
  guest_portal_ai_concierge: 'AI Concierge',
  guest_portal_loyalty: 'Guest Loyalty Portal',
  guest_management_basic: 'Guest Records',
  guest_management_pin: 'Portal PIN Management',
  guest_management_csv_import: 'CSV Import',
  guest_management_loyalty: 'Loyalty Tiers',
  guest_management_360_profile: 'Guest 360° Profile',
  guest_management_guest_requests: 'Guest Requests Queue',
  loyalty_program: 'Loyalty Program',
  loyalty_tiers: 'Loyalty Tiers Configuration',
  loyalty_earn_rules: 'Loyalty Earn Rules',
  loyalty_rewards: 'Loyalty Rewards',
  loyalty_member_management: 'Loyalty Member Management',
  activities_basic: 'Activity Management',
  activities_recurring: 'Recurring Schedules',
  activities_closures: 'Closure Days',
  activities_resources: 'Resource Assignment',
  activities_content_enrichment: 'Rich Content',
  activities_cheatsheet: 'Activity Cheatsheet',
  restaurants_basic: 'Restaurant Management',
  restaurants_recurring: 'Recurring Slots',
  restaurants_closures: 'Closure Days',
  restaurants_opening_hours: 'Opening Hours',
  todays_opportunities: "Today's Opportunities",
  pre_arrival_links: 'Pre-Arrival Links',
  in_stay_suggestions: 'In-Stay Suggestions',
  booking_source_tracking: 'Booking Source Analytics',
  reports_basic: 'Basic Reports',
  reports_activities: 'Activities Report',
  reports_restaurants: 'Restaurants Report',
  reports_cancellations: 'Cancellations Report',
  reports_guests: 'Guests Report',
  reports_feedback: 'Feedback Report',
  reports_sales_performance: 'Sales Performance',
  reports_ai_insights: 'AI Insights',
  reports_csv_export: 'CSV Export',
  settings_basic: 'Basic Settings',
  settings_pricing_charges: 'Pricing Configuration',
  settings_staff_management: 'Staff Management',
  settings_staff_invitations: 'Staff Invitations',
  settings_booking_health: 'Booking Health Check',
  notifications_in_app: 'In-App Notifications',
  notifications_realtime: 'Real-Time Updates',
};
