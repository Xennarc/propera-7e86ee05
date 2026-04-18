// Perfect Demo Resort: single entry point.
// Picks a slot (0/1/2 round-robin), wipes that slot's transactional data,
// rebases the demo guest stay to today-centered, ensures the demo staff auth
// user exists, rotates the password, and returns sign-in payload.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_RESORT_ID = "7819d1dc-485a-4309-a403-67c16c468f4b";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomPassword(): string {
  // 24-char URL-safe random password.
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 24) + "Aa1!";
}

async function wipeSlotTransactionalData(
  admin: ReturnType<typeof createClient>,
  guestId: string,
  staffUserId: string | null,
) {
  // Per-guest scoped wipes (catalog untouched).
  const tables: Array<{ table: string; column: string }> = [
    { table: "activity_bookings", column: "guest_id" },
    { table: "restaurant_reservations", column: "guest_id" },
    { table: "service_requests", column: "guest_id" },
    { table: "room_service_orders", column: "guest_id" },
    { table: "stay_feedback", column: "guest_id" },
    { table: "activity_waitlist", column: "guest_id" },
    { table: "buggy_requests", column: "guest_id" },
    { table: "booking_readiness", column: "guest_id" },
    { table: "activity_booking_readiness", column: "guest_id" },
    { table: "pre_arrival_submissions", column: "guest_id" },
  ];

  await Promise.allSettled(
    tables.map(({ table, column }) =>
      admin.from(table).delete().eq(column, guestId)
    ),
  );

  // Staff-created actions tied to this slot's staff user (notes, audit-only)
  if (staffUserId) {
    await Promise.allSettled([
      admin.from("admin_notifications").delete().eq("user_id", staffUserId),
    ]);
  }
}

async function rebaseGuestStay(
  admin: ReturnType<typeof createClient>,
  guestId: string,
) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const checkIn = new Date(today);
  checkIn.setDate(checkIn.getDate() - 1);
  const checkOut = new Date(today);
  checkOut.setDate(checkOut.getDate() + 4);

  await admin
    .from("guests")
    .update({
      check_in_date: fmt(checkIn),
      check_out_date: fmt(checkOut),
      portal_enabled: true,
    })
    .eq("id", guestId);

  // Sync stay rows
  await admin
    .from("guest_stays")
    .update({
      arrival_date: fmt(checkIn),
      departure_date: fmt(checkOut),
      status: "in_house",
    })
    .eq("guest_id", guestId);
}

// Compute "now" in a given IANA timezone as a plain {y,m,d,h,min} object.
function nowInTz(timezone: string): { date: string; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).filter((p) => p.type !== "literal").map(
      (p) => [p.type, p.value],
    ),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function addMinutesToTime(hh: number, mm: number, addMin: number): { h: number; m: number } {
  const total = hh * 60 + mm + addMin;
  return { h: Math.floor(total / 60) % 24, m: total % 60 };
}

// Regenerate today's activity_sessions for the DEMO resort so they always
// appear upcoming (no "already begun" sessions for the entering visitor).
async function regenerateTodaySessions(
  admin: ReturnType<typeof createClient>,
  resortId: string,
  timezone: string,
) {
  const { date: today, hour, minute } = nowInTz(timezone);

  // Anchor = now + 30 min, rounded up to next 30-min boundary.
  let { h: anchorH, m: anchorM } = addMinutesToTime(hour, minute, 30);
  if (anchorM % 30 !== 0) {
    const bump = 30 - (anchorM % 30);
    const next = addMinutesToTime(anchorH, anchorM, bump);
    anchorH = next.h;
    anchorM = next.m;
  }
  // Don't anchor past 19:00 — clamp so we still fit the day.
  if (anchorH >= 19) {
    anchorH = 19;
    anchorM = 0;
  }

  // Load active activities for the demo resort.
  const { data: activities, error: actErr } = await admin
    .from("activities")
    .select("id, duration_minutes, default_max_capacity")
    .eq("resort_id", resortId)
    .eq("is_active", true);
  if (actErr || !activities) return;

  // Wipe today's sessions for this resort.
  await admin
    .from("activity_sessions")
    .delete()
    .eq("resort_id", resortId)
    .eq("date", today);

  const offsetsMin = [0, 150, 300]; // anchor, +2.5h, +5h
  const rows: Array<Record<string, unknown>> = [];

  for (const a of activities) {
    const dur = Number(a.duration_minutes) || 60;
    const cap = Number(a.default_max_capacity) || 8;
    for (const off of offsetsMin) {
      const start = addMinutesToTime(anchorH, anchorM, off);
      const end = addMinutesToTime(start.h, start.m, dur);
      // Skip slot if it would end past 21:30.
      if (start.h * 60 + start.m + dur > 21 * 60 + 30) continue;
      rows.push({
        resort_id: resortId,
        activity_id: a.id,
        date: today,
        start_time: `${pad2(start.h)}:${pad2(start.m)}:00`,
        end_time: `${pad2(end.h)}:${pad2(end.m)}:00`,
        capacity: cap,
        status: "SCHEDULED",
      });
    }
  }

  if (rows.length > 0) {
    await admin.from("activity_sessions").insert(rows);
  }
}

async function ensureStaffUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  existingUserId: string | null,
): Promise<{ userId: string; password: string }> {
  const password = randomPassword();

  if (existingUserId) {
    // Rotate password on existing user.
    const { error } = await admin.auth.admin.updateUserById(existingUserId, {
      password,
      email_confirm: true,
    });
    if (!error) return { userId: existingUserId, password };
    // Fall through to recreate if update fails.
  }

  // Try to find by email
  const { data: list } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const found = list?.users?.find((u: any) =>
    (u.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (found) {
    await admin.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    });
    return { userId: found.id, password };
  }

  // Create fresh
  const { data: created, error: createErr } = await admin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Demo Admin", demo: true },
    });
  if (createErr || !created?.user) {
    throw new Error(`createUser failed: ${createErr?.message ?? "unknown"}`);
  }
  return { userId: created.user.id, password };
}

async function ensureProfileAndMembership(
  admin: ReturnType<typeof createClient>,
  userId: string,
) {
  await admin.from("profiles").upsert({
    id: userId,
    full_name: "Demo Admin",
    global_role: "STANDARD",
    account_type: "staff",
  }, { onConflict: "id" });

  await admin.from("resort_memberships").upsert({
    user_id: userId,
    resort_id: DEMO_RESORT_ID,
    resort_role: "RESORT_ADMIN",
  }, { onConflict: "user_id,resort_id" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: { portal?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const portal = body.portal;
  if (portal !== "guest" && portal !== "staff") {
    return json(400, { error: "portal must be 'guest' or 'staff'" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    // 1. Atomically claim a slot.
    const { data: slotData, error: slotErr } = await admin.rpc(
      "demo_get_next_slot",
    );
    if (slotErr) throw slotErr;
    const slot = Number(slotData);

    // 2. Load the slot's credential row.
    const { data: cred, error: credErr } = await admin
      .from("demo_credentials")
      .select("slot, email, password, user_id, guest_id")
      .eq("slot", slot)
      .single();
    if (credErr || !cred) throw credErr ?? new Error("Slot not found");

    if (!cred.guest_id) {
      return json(500, { error: `Slot ${slot} has no demo guest mapped.` });
    }

    // 3. Wipe + rebase.
    await wipeSlotTransactionalData(admin, cred.guest_id, cred.user_id ?? null);
    await rebaseGuestStay(admin, cred.guest_id);

    // 4. Resort info for client.
    const { data: resort } = await admin
      .from("resorts")
      .select("id, code, name, login_logo_url, timezone")
      .eq("id", DEMO_RESORT_ID)
      .single();

    // 4b. Refresh today's sessions so they're always upcoming for this visitor.
    await regenerateTodaySessions(admin, DEMO_RESORT_ID, resort?.timezone ?? "UTC");

    if (portal === "guest") {
      // Build a guest session payload (client writes to localStorage).
      const { data: guest } = await admin
        .from("guests")
        .select(
          "id, full_name, room_number, check_in_date, check_out_date",
        )
        .eq("id", cred.guest_id)
        .single();

      if (!guest) return json(500, { error: "Demo guest missing" });

      return json(200, {
        success: true,
        portal: "guest",
        slot,
        resortCode: resort?.code ?? "DEMO",
        guestSession: {
          guestId: guest.id,
          fullName: guest.full_name,
          roomNumber: guest.room_number,
          checkInDate: guest.check_in_date,
          checkOutDate: guest.check_out_date,
          resortId: resort?.id ?? DEMO_RESORT_ID,
          resortName: resort?.name ?? "Propera Demo Resort",
          resortLogoUrl: resort?.login_logo_url ?? undefined,
          resortTimezone: resort?.timezone ?? "UTC",
          demoSlot: slot,
        },
      });
    }

    // staff portal: ensure user, rotate password, ensure profile + membership.
    const { userId, password } = await ensureStaffUser(
      admin,
      cred.email,
      cred.user_id ?? null,
    );
    await ensureProfileAndMembership(admin, userId);

    // Persist new credentials in demo_credentials.
    await admin.from("demo_credentials").update({
      user_id: userId,
      password,
    }).eq("slot", slot);

    return json(200, {
      success: true,
      portal: "staff",
      slot,
      resortCode: resort?.code ?? "DEMO",
      auth: {
        email: cred.email,
        password,
      },
    });
  } catch (err: any) {
    console.error("[demo-enter] error", err);
    return json(500, { error: err?.message ?? "Internal error" });
  }
});
