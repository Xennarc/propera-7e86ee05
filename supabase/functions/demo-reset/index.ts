import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-reset-secret",
};

// Demo resort configuration
const DEMO_RESORT_CODE = "DEMO";

// Session schedule templates
const ACTIVITY_SESSION_TIMES = ["09:00", "14:00", "17:00"];
const RESTAURANT_MEAL_SLOTS = {
  LUNCH: { start: "12:00", end: "14:00" },
  DINNER_EARLY: { start: "19:00", end: "20:30" },
  DINNER_LATE: { start: "20:30", end: "22:00" },
};

// Demo guest date patterns (relative to today)
const DEMO_GUEST_PATTERNS = [
  { room: "101", daysFromNow: -2, stayLength: 7 },  // In-house
  { room: "102", daysFromNow: -1, stayLength: 5 },  // In-house
  { room: "201", daysFromNow: 0, stayLength: 10 },  // Arriving today
  { room: "202", daysFromNow: 1, stayLength: 8 },   // Arriving tomorrow
  { room: "301", daysFromNow: 2, stayLength: 6 },   // Arriving in 2 days
  { room: "302", daysFromNow: -4, stayLength: 3 },  // Checked out (past guest)
];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Optional secret validation - if configured, require it; otherwise allow calls
    // This enables both scheduled invocations and manual Super Admin triggers
    const secret = req.headers.get("x-demo-reset-secret") || "";
    const expectedSecret = Deno.env.get("DEMO_RESET_SECRET");
    
    // If secret is configured, validate it (but allow empty secret for internal calls)
    if (expectedSecret && secret && secret !== expectedSecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "run"; // "run" or "dry_run"
    const isDryRun = action === "dry_run";

    console.log(`Demo reset started: action=${action}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ============================================================
    // SAFETY CHECK: Find and validate demo resort
    // ============================================================
    const { data: demoResort, error: resortError } = await supabase
      .from("resorts")
      .select("id, code, is_demo, name")
      .or(`code.eq.${DEMO_RESORT_CODE},is_demo.eq.true`)
      .single();

    if (resortError || !demoResort) {
      console.error("Demo resort not found:", resortError);
      return new Response(
        JSON.stringify({ success: false, error: "Demo resort not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!demoResort.is_demo && demoResort.code !== DEMO_RESORT_CODE) {
      console.error("Safety check failed: Resort is neither is_demo=true nor code=DEMO");
      return new Response(
        JSON.stringify({ success: false, error: "Safety check failed: not a demo resort" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const demoResortId = demoResort.id;
    console.log(`Processing demo resort: ${demoResort.name} (${demoResortId})`);

    // Create log entry
    let logId: string | null = null;
    if (!isDryRun) {
      const { data: logEntry } = await supabase
        .from("demo_reset_logs")
        .insert({ action, status: "started" })
        .select("id")
        .single();
      logId = logEntry?.id;
    }

    const results = {
      deleted: { activity_bookings: 0, restaurant_reservations: 0, guest_requests: 0, booking_attendees: 0 },
      freshness: { guests_updated: 0 },
      availability: { sessions_created: 0, slots_created: 0, sessions_archived: 0, slots_archived: 0 },
      seeded: { activity_bookings: 0, restaurant_reservations: 0 },
    };

    const today = new Date();
    const todayStr = formatDate(today);

    // ============================================================
    // PASS 1: CLEANUP - Delete demo_user origin records only
    // ============================================================
    console.log("Pass 1: Cleanup demo_user records...");

    // Delete booking attendees for demo_user bookings first
    const { data: demoUserBookings } = await supabase
      .from("activity_bookings")
      .select("id")
      .eq("resort_id", demoResortId)
      .eq("origin", "demo_user");

    if (demoUserBookings?.length) {
      const bookingIds = demoUserBookings.map(b => b.id);
      if (!isDryRun) {
        await supabase.from("booking_attendees").delete().in("activity_booking_id", bookingIds);
      }
      results.deleted.booking_attendees = bookingIds.length;
    }

    // Delete demo_user activity bookings
    const { count: activityBookingsDeleted } = await supabase
      .from("activity_bookings")
      .select("id", { count: "exact", head: true })
      .eq("resort_id", demoResortId)
      .eq("origin", "demo_user");

    if (!isDryRun && activityBookingsDeleted) {
      await supabase
        .from("activity_bookings")
        .delete()
        .eq("resort_id", demoResortId)
        .eq("origin", "demo_user");
    }
    results.deleted.activity_bookings = activityBookingsDeleted || 0;

    // Delete demo_user restaurant reservations
    const { data: demoUserReservations } = await supabase
      .from("restaurant_reservations")
      .select("id")
      .eq("resort_id", demoResortId)
      .eq("origin", "demo_user");

    if (demoUserReservations?.length) {
      const reservationIds = demoUserReservations.map(r => r.id);
      if (!isDryRun) {
        await supabase.from("booking_attendees").delete().in("restaurant_reservation_id", reservationIds);
        await supabase.from("restaurant_reservations").delete().in("id", reservationIds);
      }
      results.deleted.restaurant_reservations = reservationIds.length;
    }

    // Delete demo_user guest requests
    const { count: guestRequestsDeleted } = await supabase
      .from("guest_requests")
      .select("id", { count: "exact", head: true })
      .eq("resort_id", demoResortId)
      .eq("origin", "demo_user");

    if (!isDryRun && guestRequestsDeleted) {
      await supabase
        .from("guest_requests")
        .delete()
        .eq("resort_id", demoResortId)
        .eq("origin", "demo_user");
    }
    results.deleted.guest_requests = guestRequestsDeleted || 0;

    console.log(`Cleanup complete:`, results.deleted);

    // ============================================================
    // PASS 2: FRESHNESS - Update guest dates to be today-relevant
    // ============================================================
    console.log("Pass 2: Refreshing guest dates...");

    const { data: demoGuests } = await supabase
      .from("guests")
      .select("id, room_number")
      .eq("resort_id", demoResortId);

    if (demoGuests?.length && !isDryRun) {
      for (const guest of demoGuests) {
        const pattern = DEMO_GUEST_PATTERNS.find(p => p.room === guest.room_number);
        if (pattern) {
          await supabase
            .from("guests")
            .update({
              check_in_date: formatDate(addDays(today, pattern.daysFromNow)),
              check_out_date: formatDate(addDays(today, pattern.daysFromNow + pattern.stayLength)),
              updated_at: new Date().toISOString(),
            })
            .eq("id", guest.id);
          results.freshness.guests_updated++;
        }
      }
    } else if (demoGuests?.length) {
      results.freshness.guests_updated = demoGuests.filter(g => 
        DEMO_GUEST_PATTERNS.some(p => p.room === g.room_number)
      ).length;
    }

    console.log(`Guest freshness: ${results.freshness.guests_updated} updated`);

    // ============================================================
    // PASS 3: AVAILABILITY - Ensure 14-day inventory
    // ============================================================
    console.log("Pass 3: Ensuring availability for next 14 days...");

    // Archive old sessions (> 7 days ago)
    const archiveCutoff = formatDate(addDays(today, -7));
    
    if (!isDryRun) {
      // Delete bookings on old sessions first
      const { data: oldSessions } = await supabase
        .from("activity_sessions")
        .select("id")
        .eq("resort_id", demoResortId)
        .lt("date", archiveCutoff);

      if (oldSessions?.length) {
        const oldSessionIds = oldSessions.map(s => s.id);
        await supabase.from("activity_bookings").delete().in("session_id", oldSessionIds);
        await supabase.from("activity_sessions").delete().in("id", oldSessionIds);
        results.availability.sessions_archived = oldSessions.length;
      }

      // Delete old restaurant slots
      const { data: oldSlots } = await supabase
        .from("restaurant_time_slots")
        .select("id")
        .eq("resort_id", demoResortId)
        .lt("date", archiveCutoff);

      if (oldSlots?.length) {
        const oldSlotIds = oldSlots.map(s => s.id);
        await supabase.from("restaurant_reservations").delete().in("restaurant_slot_id", oldSlotIds);
        await supabase.from("restaurant_time_slots").delete().in("id", oldSlotIds);
        results.availability.slots_archived = oldSlots.length;
      }
    }

    // Get activities for session creation
    const { data: activities } = await supabase
      .from("activities")
      .select("id, default_max_capacity, duration_minutes, category")
      .eq("resort_id", demoResortId)
      .eq("is_active", true);

    // Get restaurants for slot creation
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("id, total_capacity")
      .eq("resort_id", demoResortId)
      .eq("is_active", true);

    // Create sessions for next 14 days
    if (activities?.length && !isDryRun) {
      for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const sessionDate = formatDate(addDays(today, dayOffset));
        
        for (const activity of activities) {
          // Determine time slots based on category
          const times = activity.category === "EXCURSION" 
            ? ["09:00", "14:00"] 
            : ACTIVITY_SESSION_TIMES;

          for (const startTime of times) {
            // Check if session already exists
            const { data: existing } = await supabase
              .from("activity_sessions")
              .select("id")
              .eq("resort_id", demoResortId)
              .eq("activity_id", activity.id)
              .eq("date", sessionDate)
              .eq("start_time", startTime)
              .single();

            if (!existing) {
              const durationHours = activity.duration_minutes / 60;
              const startHour = parseInt(startTime.split(":")[0]);
              const endHour = Math.floor(startHour + durationHours);
              const endMinutes = Math.round((durationHours - Math.floor(durationHours)) * 60);
              const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

              await supabase.from("activity_sessions").insert({
                resort_id: demoResortId,
                activity_id: activity.id,
                date: sessionDate,
                start_time: startTime,
                end_time: endTime,
                capacity: activity.default_max_capacity,
                status: "SCHEDULED",
              });
              results.availability.sessions_created++;
            }
          }
        }
      }
    }

    // Create restaurant slots for next 14 days
    if (restaurants?.length && !isDryRun) {
      for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const slotDate = formatDate(addDays(today, dayOffset));
        
        for (const restaurant of restaurants) {
          for (const [mealPeriod, times] of Object.entries(RESTAURANT_MEAL_SLOTS)) {
            // Check if slot already exists
            const { data: existing } = await supabase
              .from("restaurant_time_slots")
              .select("id")
              .eq("resort_id", demoResortId)
              .eq("restaurant_id", restaurant.id)
              .eq("date", slotDate)
              .eq("start_time", times.start)
              .single();

            if (!existing) {
              const period = mealPeriod.startsWith("DINNER") ? "DINNER" : "LUNCH";
              await supabase.from("restaurant_time_slots").insert({
                resort_id: demoResortId,
                restaurant_id: restaurant.id,
                date: slotDate,
                start_time: times.start,
                end_time: times.end,
                meal_period: period,
                capacity: Math.floor(restaurant.total_capacity / 2),
                status: "OPEN",
              });
              results.availability.slots_created++;
            }
          }
        }
      }
    }

    console.log(`Availability:`, results.availability);

    // ============================================================
    // PASS 4: AUTO-HEAL - Ensure dashboards have seed activity
    // ============================================================
    console.log("Pass 4: Auto-healing seeded bookings...");

    // Count existing seed bookings in next 7 days
    const next7Days = formatDate(addDays(today, 7));
    
    const { count: seedBookingsCount } = await supabase
      .from("activity_bookings")
      .select("id", { count: "exact", head: true })
      .eq("resort_id", demoResortId)
      .eq("origin", "seed")
      .gte("created_at", todayStr);

    const { count: seedReservationsCount } = await supabase
      .from("restaurant_reservations")
      .select("id", { count: "exact", head: true })
      .eq("resort_id", demoResortId)
      .eq("origin", "seed")
      .gte("created_at", todayStr);

    const needsBookings = (seedBookingsCount || 0) < 3;
    const needsReservations = (seedReservationsCount || 0) < 2;

    if ((needsBookings || needsReservations) && !isDryRun) {
      // Get in-house guests
      const { data: inHouseGuests } = await supabase
        .from("guests")
        .select("id, room_number, check_in_date, check_out_date")
        .eq("resort_id", demoResortId)
        .lte("check_in_date", todayStr)
        .gte("check_out_date", todayStr);

      if (inHouseGuests?.length) {
        // Create seed activity bookings
        if (needsBookings) {
          const { data: upcomingSessions } = await supabase
            .from("activity_sessions")
            .select("id, activity_id, date, activities(default_price_per_person)")
            .eq("resort_id", demoResortId)
            .eq("status", "SCHEDULED")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true })
            .limit(6);

          if (upcomingSessions?.length) {
            for (let i = 0; i < Math.min(3, upcomingSessions.length); i++) {
              const session = upcomingSessions[i];
              const guest = inHouseGuests[i % inHouseGuests.length];
              const price = (session.activities as any)?.default_price_per_person || 50;

              await supabase.from("activity_bookings").insert({
                resort_id: demoResortId,
                guest_id: guest.id,
                session_id: session.id,
                room_number: guest.room_number,
                num_adults: 2,
                num_children: 0,
                status: "CONFIRMED",
                source: "STAFF",
                origin: "seed",
                price_per_person: price,
                total_amount: price * 2,
              });
              results.seeded.activity_bookings++;
            }
          }
        }

        // Create seed restaurant reservations
        if (needsReservations) {
          const { data: upcomingSlots } = await supabase
            .from("restaurant_time_slots")
            .select("id, restaurant_id, date")
            .eq("resort_id", demoResortId)
            .eq("status", "OPEN")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true })
            .limit(4);

          if (upcomingSlots?.length) {
            for (let i = 0; i < Math.min(2, upcomingSlots.length); i++) {
              const slot = upcomingSlots[i];
              const guest = inHouseGuests[i % inHouseGuests.length];

              await supabase.from("restaurant_reservations").insert({
                resort_id: demoResortId,
                guest_id: guest.id,
                restaurant_slot_id: slot.id,
                room_number: guest.room_number,
                num_adults: 2,
                num_children: 0,
                status: "CONFIRMED",
                source: "STAFF",
                origin: "seed",
              });
              results.seeded.restaurant_reservations++;
            }
          }
        }
      }
    }

    console.log(`Seeded:`, results.seeded);

    // Update log entry with results
    const duration = Date.now() - startTime;
    
    if (logId && !isDryRun) {
      await supabase
        .from("demo_reset_logs")
        .update({
          status: "success",
          deleted_counts_json: results.deleted,
          freshness_updates_json: results.freshness,
          availability_updates_json: results.availability,
          seeded_bookings_json: results.seeded,
          duration_ms: duration,
        })
        .eq("id", logId);
    }

    console.log(`Demo reset completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        dry_run: isDryRun,
        resort: { id: demoResortId, name: demoResort.name, code: demoResort.code },
        results,
        duration_ms: duration,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Demo reset error:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
