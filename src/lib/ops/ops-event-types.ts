/**
 * OpsEvent — Unified event type for the Ops Adapter layer.
 *
 * Every source (activity_sessions, dining_reservations, etc.) is normalized
 * into this shape so Planner/Inbox/Master can render from a single stream.
 */

export type OpsEventSourceType =
  | 'activity_session'
  | 'dining_reservation';

export type OpsEventStatus =
  | 'SCHEDULED'
  | 'CHECK_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string; // allow future statuses

export interface OpsEvent {
  /** Unique event ID (same as source row ID for 1:1 sources) */
  id: string;
  /** ISO datetime of event start */
  start_at: string;
  /** ISO datetime of event end */
  end_at: string;
  /** Display title (e.g. activity name, restaurant + meal period) */
  title: string;
  /** Normalised status */
  status: OpsEventStatus;
  /** Which source table produced this event */
  source_type: OpsEventSourceType;
  /** Primary key in the source table */
  source_id: string;
  /** Optional lane key for Planner views (asset ID, staff ID, venue name) */
  lane_key?: string | null;
  /** Arbitrary metadata bag — adapters stuff source-specific data here */
  meta: Record<string, unknown>;
}

/**
 * Adapter query params — passed to every adapter's getOpsEvents.
 */
export interface OpsAdapterParams {
  resortId: string;
  dateRange: { start: string; end: string };
  /** Activity category keys or restaurant IDs the department owns */
  scope: {
    activityCategoryKeys: string[];
    restaurantIds: string[];
  };
  /** Optional text filter applied client-side by the caller */
  search?: string;
}

/**
 * Adapter contract — each source module implements this.
 */
export interface OpsEventAdapter {
  /** Human-readable name for debugging */
  name: string;
  /** Fetch normalised events for the given params */
  getOpsEvents(params: OpsAdapterParams): Promise<OpsEvent[]>;
}
