// Perfect Demo Resort: per-slot reset.
// Called on demo exit (button click or pagehide beacon). Wipes the slot's
// transactional data and rebases the stay. No cron coupling.

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

async function wipeSlotData(
  admin: ReturnType<typeof createClient>,
  guestId: string,
) {
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

  await admin.from("guests").update({
    check_in_date: fmt(checkIn),
    check_out_date: fmt(checkOut),
    portal_enabled: true,
  }).eq("id", guestId);

  await admin.from("guest_stays").update({
    arrival_date: fmt(checkIn),
    departure_date: fmt(checkOut),
    status: "in_house",
  }).eq("guest_id", guestId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: { slot?: number };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
    return json(400, { error: "slot must be 0, 1, or 2" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const { data: cred } = await admin
      .from("demo_credentials")
      .select("slot, guest_id")
      .eq("slot", slot)
      .single();

    if (!cred?.guest_id) {
      return json(404, { error: "Slot or guest not found" });
    }

    await wipeSlotData(admin, cred.guest_id);
    await rebaseGuestStay(admin, cred.guest_id);

    return json(200, { success: true, slot, resortId: DEMO_RESORT_ID });
  } catch (err: any) {
    console.error("[demo-reset] error", err);
    return json(500, { error: err?.message ?? "Internal error" });
  }
});
