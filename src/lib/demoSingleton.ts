// Shared Golden Demo Resort Configuration
// Perfect Demo Resort — pool of 3 rotated identities.

export const DEMO_RESORT_CODE = "DEMO";
export const DEMO_RESORT_ID = "7819d1dc-485a-4309-a403-67c16c468f4b";
export const DEMO_RESORT_NAME = "Propera Demo Resort";

export type DemoSlot = 0 | 1 | 2;

// Demo guest pool (room numbers seeded in DB + linked to demo_credentials).
export const DEMO_GUEST_ROOMS: Record<DemoSlot, string> = {
  0: "101",
  1: "102",
  2: "201",
};

// Storage keys (kept here so all demo code uses one source of truth).
export const DEMO_SLOT_STORAGE_KEY = "propera_demo_slot";

// Legacy constants retained for any older imports.
export const DEMO_TOKEN_TTL_MIN = 15;
export const DEMO_RESEND_COOLDOWN_SEC = 60;
export const DEMO_STAFF_EMAIL = "demo-staff-1@propera.cc";
export const DEMO_GUEST_ROOM = "101";
export const DEMO_GUEST_NAME = "James Wilson";
export const DEMO_GUEST_LAST_NAME = "Wilson";
export const SHARED_WORKSPACE_EMAIL = "__shared_demo__";
