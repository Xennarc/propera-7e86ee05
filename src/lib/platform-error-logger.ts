import { supabase } from '@/integrations/supabase/client';

// ==========================================
// Error Severity Levels
// ==========================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// ==========================================
// Route Prefixes for Categorization
// ==========================================

export const ERROR_ROUTES = {
  PRICING: '/superadmin/plans',
  SUBSCRIPTION_ALERTS: '/superadmin/subscription-alerts',
  AUTH: '/auth',
  DATA: '/data',
} as const;

export type ErrorRoute = typeof ERROR_ROUTES[keyof typeof ERROR_ROUTES];

// ==========================================
// Platform Error Logger
// ==========================================

interface LogErrorParams {
  route: string;
  action: string;
  errorMessage: string;
  severity?: ErrorSeverity;
  resortId?: string | null;
  userId?: string | null;
  errorStack?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an error to the platform_errors table for observability.
 * This is a fire-and-forget operation - errors in logging are swallowed.
 */
export async function logPlatformError({
  route,
  action,
  errorMessage,
  severity = 'error',
  resortId = null,
  userId = null,
  errorStack = null,
  metadata = {},
}: LogErrorParams): Promise<void> {
  try {
    await supabase.from('platform_errors').insert({
      route,
      action,
      error_message: errorMessage,
      severity,
      resort_id: resortId,
      user_id: userId,
      error_stack: errorStack,
      user_type: 'staff',
      metadata_json: {
        ...metadata,
        logged_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    // Swallow logging errors - don't let observability break the app
    console.error('[PlatformErrorLogger] Failed to log error:', e);
  }
}

// ==========================================
// Convenience Loggers
// ==========================================

export function logPricingError(
  action: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logPlatformError({
    route: ERROR_ROUTES.PRICING,
    action,
    errorMessage,
    severity: 'error',
    metadata,
  });
}

export function logSubscriptionAlertError(
  action: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logPlatformError({
    route: ERROR_ROUTES.SUBSCRIPTION_ALERTS,
    action,
    errorMessage,
    severity: 'warning',
    metadata,
  });
}
