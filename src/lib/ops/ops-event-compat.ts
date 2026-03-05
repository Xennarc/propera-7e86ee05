/**
 * Compatibility mappers: convert OpsEvent[] back to the shapes
 * that existing Planner/Inbox/Master components expect.
 *
 * This layer exists so the adapter pipeline can plug in without
 * touching any existing UI components.
 */
import type { OpsEvent } from './ops-event-types';
import type { DepartureCardData } from '@/components/activities/ops/DepartureCard';
import { differenceInMinutes } from 'date-fns';

const STARTING_SOON_MINUTES = 60;

/**
 * Maps an OpsEvent to the shape DeptInboxPage renders (DepartureCardData).
 */
export function opsEventToInboxCard(event: OpsEvent): DepartureCardData & { _minutesUntil: number } {
  const now = new Date();
  const sessionDateTime = new Date(event.start_at);
  const minutesUntil = differenceInMinutes(sessionDateTime, now);

  return {
    sessionId: event.source_id,
    activityName: event.title,
    status: event.status,
    startTime: (event.meta.start_time as string) ?? event.start_at.split('T')[1],
    endTime: (event.meta.end_time as string) ?? event.end_at.split('T')[1],
    date: (event.meta.date as string) ?? event.start_at.split('T')[0],
    bookedPax: 0, // booking counts are fetched separately by the page
    capacity: (event.meta.capacity as number) ?? 0,
    startingSoon: minutesUntil <= STARTING_SOON_MINUTES && minutesUntil > 0,
    _minutesUntil: minutesUntil,
  };
}

/**
 * Maps OpsEvents to the raw session shape used by DeptPlannerPage queries.
 * The planner enriches these further (bookings, assignments, coverage).
 */
export function opsEventToPlannerSession(event: OpsEvent) {
  return {
    id: event.source_id,
    date: (event.meta.date as string) ?? event.start_at.split('T')[0],
    start_time: (event.meta.start_time as string) ?? event.start_at.split('T')[1],
    end_time: (event.meta.end_time as string) ?? event.end_at.split('T')[1],
    capacity: (event.meta.capacity as number) ?? 0,
    status: event.status,
    activity: {
      name: event.title,
      category: (event.meta.category as string) ?? null,
      ops_rules_json: null,
      requirements_json: null,
    },
  };
}
