/**
 * Audit utilities for Propera
 * 
 * Client-side helpers for audit logging.
 * Database triggers handle most audit logging automatically.
 * These utilities are for explicit logging from the frontend.
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'BOOKING_CREATED'
  | 'BOOKING_UPDATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_DELETED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_UPDATED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_DELETED'
  | 'SESSION_CREATED'
  | 'SESSION_UPDATED'
  | 'SESSION_CANCELLED'
  | 'SESSION_DELETED'
  | 'GUEST_CREATED'
  | 'GUEST_UPDATED'
  | 'GUEST_DELETED'
  | 'GUEST_PIN_RESET'
  | 'GUEST_PORTAL_ACCESS_CHANGED'
  | 'GUEST_VIP_STATUS_CHANGED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_CHANGED'
  | 'ROLE_REMOVED'
  | 'PREARRIVAL_CREATED'
  | 'PREARRIVAL_UPDATED'
  | 'PREARRIVAL_COMPLETED'
  | 'PREARRIVAL_STAFF_REVIEWED'
  | 'VENDOR_STATUS_CHANGED'
  | 'VENDOR_ACKNOWLEDGED'
  | 'VENDOR_COMPLETED'
  | 'VIEW_AS_STARTED'
  | 'VIEW_AS_ENDED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PERMISSION_OVERRIDE_GRANT'
  | 'PERMISSION_OVERRIDE_REVOKE'
  | 'PERMISSION_OVERRIDE_REMOVED';

export type AuditEntity =
  | 'activity_bookings'
  | 'restaurant_reservations'
  | 'activity_sessions'
  | 'restaurant_time_slots'
  | 'guests'
  | 'resort_memberships'
  | 'user_permission_overrides'
  | 'prearrival_profiles'
  | 'view_as_session'
  | 'auth_session';

export interface AuditLogEntry {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  resortId?: string;
  effectiveUserId?: string;
}

/**
 * Log an audit event via RPC
 * Most audit logging is done via database triggers, but this can be used
 * for explicit logging from the frontend.
 */
export async function logAudit(entry: AuditLogEntry): Promise<string | null> {
  try {
    const metadata = {
      ...entry.metadata,
      client_timestamp: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };
    
    const { data, error } = await supabase.rpc('log_audit', {
      p_action: entry.action,
      p_entity: entry.entity,
      p_entity_id: entry.entityId || null,
      p_before: entry.before ? JSON.parse(JSON.stringify(entry.before)) : null,
      p_after: entry.after ? JSON.parse(JSON.stringify(entry.after)) : null,
      p_metadata: JSON.parse(JSON.stringify(metadata)),
      p_resort_id: entry.resortId || null,
      p_effective_user_id: entry.effectiveUserId || null,
    });

    if (error) {
      console.error('[Audit] Failed to log audit event:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('[Audit] Exception logging audit event:', err);
    return null;
  }
}

/**
 * Log a View As session start
 */
export async function logViewAsStart(
  targetUserId: string,
  targetResortId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_view_as_session', {
      p_target_user_id: targetUserId,
      p_target_resort_id: targetResortId,
      p_action: 'VIEW_AS_STARTED',
    });

    if (error) {
      console.error('[Audit] Failed to log View As start:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('[Audit] Exception logging View As start:', err);
    return null;
  }
}

/**
 * Log a View As session end
 */
export async function logViewAsEnd(
  targetUserId: string,
  targetResortId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_view_as_session', {
      p_target_user_id: targetUserId,
      p_target_resort_id: targetResortId,
      p_action: 'VIEW_AS_ENDED',
    });

    if (error) {
      console.error('[Audit] Failed to log View As end:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('[Audit] Exception logging View As end:', err);
    return null;
  }
}

/**
 * Create a mutation wrapper that automatically logs audits
 * 
 * Usage:
 * const updateBooking = wrapMutationWithAudit(
 *   async (data) => supabase.from('activity_bookings').update(data),
 *   'BOOKING_UPDATED',
 *   'activity_bookings'
 * );
 */
export function wrapMutationWithAudit<T extends { id?: string }, R>(
  mutationFn: (data: T) => Promise<R>,
  action: AuditAction,
  entity: AuditEntity,
  options?: {
    resortId?: string;
    getBefore?: (data: T) => Promise<Record<string, unknown> | undefined>;
    getAfter?: (data: T, result: R) => Record<string, unknown> | undefined;
    getMetadata?: (data: T) => Record<string, unknown>;
  }
): (data: T) => Promise<R> {
  return async (data: T) => {
    const before = options?.getBefore ? await options.getBefore(data) : undefined;
    
    const result = await mutationFn(data);
    
    const after = options?.getAfter ? options.getAfter(data, result) : data;
    
    // Log audit asynchronously - don't block the mutation
    logAudit({
      action,
      entity,
      entityId: data.id,
      before,
      after: after as Record<string, unknown>,
      metadata: options?.getMetadata?.(data),
      resortId: options?.resortId,
    }).catch(console.error);
    
    return result;
  };
}

/**
 * Compute a diff between two objects for audit logging
 * Returns only the changed fields
 */
export function computeAuditDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): { changed: string[]; diff: Record<string, { old: unknown; new: unknown }> } {
  const changed: string[] = [];
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  
  if (!before && !after) {
    return { changed, diff };
  }
  
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  
  for (const key of allKeys) {
    const oldVal = before?.[key];
    const newVal = after?.[key];
    
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.push(key);
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  
  return { changed, diff };
}
