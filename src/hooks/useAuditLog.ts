/**
 * Audit Log Hook
 * 
 * Provides access to audit logs for the current resort.
 * Used by admin interfaces to view audit trails.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResortScope } from './sync/useResortScope';

export interface AuditLogRecord {
  id: string;
  created_at: string;
  resort_id: string | null;
  actor_user_id: string | null;
  effective_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  // Joined fields
  actor?: {
    full_name: string | null;
    username: string | null;
  };
  effective_user?: {
    full_name: string | null;
    username: string | null;
  };
}

export interface UseAuditLogOptions {
  /** Filter by entity type */
  entity?: string;
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by action */
  action?: string;
  /** Filter by actor user ID */
  actorUserId?: string;
  /** Number of records to fetch */
  limit?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

/**
 * Hook to fetch audit logs for the current resort
 * 
 * Usage:
 * const { data: logs, isLoading } = useAuditLogs({ entity: 'activity_bookings' });
 */
export function useAuditLogs(options: UseAuditLogOptions = {}) {
  const { resortId, isSuperAdmin } = useResortScope();
  const { entity, entityId, action, actorUserId, limit = 100, enabled = true } = options;
  
  return useQuery({
    queryKey: ['audit-logs', resortId, entity, entityId, action, actorUserId, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Super admins can see all logs, others only their resort
      if (!isSuperAdmin && resortId) {
        query = query.eq('resort_id', resortId);
      }
      
      if (entity) {
        query = query.eq('entity', entity);
      }
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      if (action) {
        query = query.eq('action', action);
      }
      
      if (actorUserId) {
        query = query.eq('actor_user_id', actorUserId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch actor profiles separately to avoid FK issues
      const logs = data as unknown as AuditLogRecord[];
      const actorIds = [...new Set(logs.map(l => l.actor_user_id).filter(Boolean))];
      const effectiveIds = [...new Set(logs.map(l => l.effective_user_id).filter(Boolean))];
      const allUserIds = [...new Set([...actorIds, ...effectiveIds])];
      
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', allUserIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        for (const log of logs) {
          if (log.actor_user_id) {
            log.actor = profileMap.get(log.actor_user_id) as AuditLogRecord['actor'];
          }
          if (log.effective_user_id) {
            log.effective_user = profileMap.get(log.effective_user_id) as AuditLogRecord['effective_user'];
          }
        }
      }
      
      return logs;
    },
    enabled: enabled && (!!resortId || isSuperAdmin),
  });
}

/**
 * Hook to fetch audit logs for a specific entity
 * 
 * Usage:
 * const { data: history } = useEntityAuditHistory('activity_bookings', bookingId);
 */
export function useEntityAuditHistory(entity: string, entityId: string | undefined) {
  return useAuditLogs({
    entity,
    entityId,
    enabled: !!entityId,
    limit: 50,
  });
}

/**
 * Action labels for display
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'Booking Created',
  BOOKING_UPDATED: 'Booking Updated',
  BOOKING_CANCELLED: 'Booking Cancelled',
  BOOKING_DELETED: 'Booking Deleted',
  RESERVATION_CREATED: 'Reservation Created',
  RESERVATION_UPDATED: 'Reservation Updated',
  RESERVATION_CANCELLED: 'Reservation Cancelled',
  RESERVATION_DELETED: 'Reservation Deleted',
  SESSION_CREATED: 'Session Created',
  SESSION_UPDATED: 'Session Updated',
  SESSION_CANCELLED: 'Session Cancelled',
  SESSION_DELETED: 'Session Deleted',
  GUEST_CREATED: 'Guest Created',
  GUEST_UPDATED: 'Guest Updated',
  GUEST_DELETED: 'Guest Deleted',
  GUEST_PIN_RESET: 'PIN Reset',
  GUEST_PORTAL_ACCESS_CHANGED: 'Portal Access Changed',
  GUEST_VIP_STATUS_CHANGED: 'VIP Status Changed',
  ROLE_ASSIGNED: 'Role Assigned',
  ROLE_CHANGED: 'Role Changed',
  ROLE_REMOVED: 'Role Removed',
  PREARRIVAL_CREATED: 'Pre-arrival Created',
  PREARRIVAL_UPDATED: 'Pre-arrival Updated',
  PREARRIVAL_COMPLETED: 'Pre-arrival Completed',
  PREARRIVAL_STAFF_REVIEWED: 'Pre-arrival Reviewed',
  VENDOR_STATUS_CHANGED: 'Vendor Status Changed',
  VENDOR_ACKNOWLEDGED: 'Vendor Acknowledged',
  VENDOR_COMPLETED: 'Vendor Completed',
  VIEW_AS_STARTED: 'View As Started',
  VIEW_AS_ENDED: 'View As Ended',
};

/**
 * Get human-readable label for an action
 */
export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] || action.replace(/_/g, ' ');
}

/**
 * Entity labels for display
 */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  activity_bookings: 'Activity Booking',
  restaurant_reservations: 'Restaurant Reservation',
  activity_sessions: 'Activity Session',
  restaurant_time_slots: 'Restaurant Slot',
  guests: 'Guest',
  resort_memberships: 'Staff Membership',
  user_permission_overrides: 'Permission Override',
  prearrival_profiles: 'Pre-arrival Profile',
  view_as_session: 'View As Session',
  auth_session: 'Authentication',
};

/**
 * Get human-readable label for an entity
 */
export function getAuditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] || entity.replace(/_/g, ' ');
}
