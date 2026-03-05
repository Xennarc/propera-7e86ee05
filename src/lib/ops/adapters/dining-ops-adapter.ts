/**
 * DiningOpsAdapter — Stub for future dining reservation → OpsEvent mapping.
 *
 * Returns empty array. Gated behind ops_events_adapter_enabled flag.
 */
import type { OpsEventAdapter, OpsAdapterParams, OpsEvent } from '../ops-event-types';

export const DiningOpsAdapter: OpsEventAdapter = {
  name: 'DiningOpsAdapter',

  async getOpsEvents(_params: OpsAdapterParams): Promise<OpsEvent[]> {
    // Stub: dining events will be implemented when the dining ops module is built
    return [];
  },
};
