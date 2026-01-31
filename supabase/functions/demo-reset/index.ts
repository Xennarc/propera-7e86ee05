import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-demo-reset-secret",
};

// Demo resort configuration
const DEMO_RESORT_CODE = "DEMO";

// Activity-specific session time slots (matches provision-demo logic)
const ACTIVITY_TIME_SLOTS: Record<string, { time: string }[]> = {
  // Category defaults
  SPA: [{ time: "09:00" }, { time: "11:00" }, { time: "14:00" }, { time: "16:00" }],
  DIVE: [{ time: "07:30" }, { time: "10:30" }, { time: "14:00" }],
  WATERSPORT: [{ time: "08:00" }, { time: "10:30" }, { time: "14:00" }, { time: "16:00" }],
  EXCURSION: [{ time: "09:00" }, { time: "14:00" }],
  
  // Activity-specific overrides
  "Sunrise Yoga": [{ time: "06:00" }],
  "Night Fishing": [{ time: "17:30" }],
  "Sunset Dolphin Cruise": [{ time: "17:00" }],
  "Night Snorkel": [{ time: "19:30" }],
  "Photography Tour": [{ time: "05:30" }, { time: "17:00" }],
  "Sandbank Picnic": [{ time: "10:00" }],
  "Couples Spa Ritual": [{ time: "10:00" }, { time: "15:00" }],
  "Advanced Reef Dive": [{ time: "07:00" }, { time: "13:30" }],
};

// Helper to get time slots for an activity
function getActivityTimeSlots(activityName: string, category: string): { time: string }[] {
  if (ACTIVITY_TIME_SLOTS[activityName]) {
    return ACTIVITY_TIME_SLOTS[activityName];
  }
  return ACTIVITY_TIME_SLOTS[category] || [{ time: "09:00" }, { time: "14:00" }];
}

// Restaurant slot configuration
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
    // Prefer resort with code=DEMO, otherwise get the first is_demo=true resort
    const { data: demoResorts, error: resortError } = await supabase
      .from("resorts")
      .select("id, code, is_demo, name, feature_flags")
      .or(`code.eq.${DEMO_RESORT_CODE},is_demo.eq.true`)
      .order("code", { ascending: true }); // DEMO comes first alphabetically

    if (resortError || !demoResorts?.length) {
      console.error("Demo resort not found:", resortError);
      return new Response(
        JSON.stringify({ success: false, error: "Demo resort not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prefer resort with exact code "DEMO", otherwise use first result
    const demoResort = demoResorts.find(r => r.code === DEMO_RESORT_CODE) || demoResorts[0];

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
      deleted: { activity_bookings: 0, restaurant_reservations: 0, guest_requests: 0, booking_attendees: 0, buggy_requests: 0 },
      freshness: { guests_updated: 0 },
      availability: { sessions_created: 0, slots_created: 0, sessions_archived: 0, slots_archived: 0 },
      seeded: { activity_bookings: 0, restaurant_reservations: 0, service_requests: 0, transport: { stops: 0, routes: 0, buggies: 0, drivers: 0, requests: 0 } },
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
    // PASS 2: DEDUPLICATE - Remove duplicate guests per room
    // ============================================================
    console.log("Pass 2: Deduplicating guests by room number...");

    const { data: allGuests } = await supabase
      .from("guests")
      .select("id, room_number, created_at")
      .eq("resort_id", demoResortId)
      .order("created_at", { ascending: true });

    let duplicatesDeleted = 0;
    if (allGuests?.length && !isDryRun) {
      // Group by room, keep oldest
      const roomMap = new Map<string, string[]>();
      for (const guest of allGuests) {
        const existing = roomMap.get(guest.room_number) || [];
        existing.push(guest.id);
        roomMap.set(guest.room_number, existing);
      }
      
      for (const [room, guestIds] of roomMap) {
        if (guestIds.length > 1) {
          const duplicateIds = guestIds.slice(1); // Keep first (oldest)
          // Delete related records first
          await supabase.from("activity_bookings").delete().in("guest_id", duplicateIds);
          await supabase.from("restaurant_reservations").delete().in("guest_id", duplicateIds);
          await supabase.from("guest_requests").delete().in("guest_id", duplicateIds);
          await supabase.from("booking_attendees").delete().in("guest_id", duplicateIds);
          await supabase.from("travel_party_members").delete().in("guest_id", duplicateIds);
          await supabase.from("guest_sessions").delete().in("guest_id", duplicateIds);
          await supabase.from("guests").delete().in("id", duplicateIds);
          duplicatesDeleted += duplicateIds.length;
        }
      }
    }
    console.log(`Deduplicated: ${duplicatesDeleted} duplicate guests removed`);

    // ============================================================
    // PASS 3: FRESHNESS - Update guest dates to be today-relevant
    // ============================================================
    console.log("Pass 3: Refreshing guest dates...");

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
    // PASS 4: AVAILABILITY - Ensure 14-day inventory
    // ============================================================
    console.log("Pass 4: Ensuring availability for next 14 days...");

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

    // Get activities for session creation (include name for time slot lookup)
    const { data: activities } = await supabase
      .from("activities")
      .select("id, name, default_max_capacity, duration_minutes, category")
      .eq("resort_id", demoResortId)
      .eq("is_active", true);

    // Get restaurants for slot creation
    const { data: restaurants } = await supabase
      .from("restaurants")
      .select("id, total_capacity")
      .eq("resort_id", demoResortId)
      .eq("is_active", true);

    // Create sessions for next 14 days using activity-specific time slots
    if (activities?.length && !isDryRun) {
      for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const sessionDate = formatDate(addDays(today, dayOffset));
        
        for (const activity of activities) {
          // Get activity-specific time slots
          const timeSlots = getActivityTimeSlots(activity.name, activity.category);

          for (const slot of timeSlots) {
            // Check if session already exists
            const { data: existing } = await supabase
              .from("activity_sessions")
              .select("id")
              .eq("resort_id", demoResortId)
              .eq("activity_id", activity.id)
              .eq("date", sessionDate)
              .eq("start_time", slot.time)
              .single();

            if (!existing) {
              // Calculate end time based on duration
              const [startHour, startMin] = slot.time.split(":").map(Number);
              const totalMinutes = startHour * 60 + startMin + activity.duration_minutes;
              const endHour = Math.floor(totalMinutes / 60);
              const endMin = totalMinutes % 60;
              const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

              await supabase.from("activity_sessions").insert({
                resort_id: demoResortId,
                activity_id: activity.id,
                date: sessionDate,
                start_time: slot.time,
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
    // PASS 5: AUTO-HEAL - Ensure dashboards have seed activity
    // ============================================================
    console.log("Pass 5: Auto-healing seeded bookings...");

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

    // Increased thresholds: 5 activity bookings, 3 reservations for richer demo
    const needsBookings = (seedBookingsCount || 0) < 5;
    const needsReservations = (seedReservationsCount || 0) < 3;

    if ((needsBookings || needsReservations) && !isDryRun) {
      // Get in-house guests - prioritize room 201 (demo portal guest)
      const { data: inHouseGuests } = await supabase
        .from("guests")
        .select("id, room_number, check_in_date, check_out_date")
        .eq("resort_id", demoResortId)
        .lte("check_in_date", todayStr)
        .gte("check_out_date", todayStr);

      if (inHouseGuests?.length) {
        // Prioritize room 101 (demo portal guest - James Wilson) for all seed bookings
        const demoPortalGuest = inHouseGuests.find(g => g.room_number === "101") || inHouseGuests[0];

        // Create seed activity bookings with category diversity
        if (needsBookings) {
          // Get sessions with activity details for category-aware selection
          const { data: upcomingSessions } = await supabase
            .from("activity_sessions")
            .select(`
              id, activity_id, date, start_time,
              activities(name, category, default_price_per_person)
            `)
            .eq("resort_id", demoResortId)
            .eq("status", "SCHEDULED")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true });

          if (upcomingSessions?.length) {
            // Pick one session per category for variety, plus extras
            const categoryPicks = new Map<string, any>();
            const extraSessions: any[] = [];
            
            for (const session of upcomingSessions) {
              const cat = (session.activities as any)?.category;
              if (!cat) continue;
              
              if (!categoryPicks.has(cat)) {
                categoryPicks.set(cat, session);
              } else if (extraSessions.length < 2) {
                // Add a couple extra for variety
                extraSessions.push(session);
              }
            }
            
            // Combine category picks + extras for 5 total bookings
            const sessionsToBook = [...categoryPicks.values(), ...extraSessions].slice(0, 5);
            
            // Create 4 CONFIRMED + 1 PENDING (last one) to showcase approval workflow
            for (let i = 0; i < sessionsToBook.length; i++) {
              const session = sessionsToBook[i];
              const price = (session.activities as any)?.default_price_per_person || 50;
              const isLastOne = i === sessionsToBook.length - 1;
              
              await supabase.from("activity_bookings").insert({
                resort_id: demoResortId,
                guest_id: demoPortalGuest.id,
                session_id: session.id,
                room_number: demoPortalGuest.room_number,
                num_adults: 2,
                num_children: 0,
                status: isLastOne ? "PENDING" : "CONFIRMED",
                source: "STAFF",
                origin: "seed",
                price_per_person: price,
                total_amount: price * 2,
              });
              results.seeded.activity_bookings++;
            }
          }
        }

        // Create seed restaurant reservations across different restaurants
        if (needsReservations) {
          // Get slots with restaurant info for variety
          const { data: upcomingSlots } = await supabase
            .from("restaurant_time_slots")
            .select(`
              id, restaurant_id, date, start_time, meal_period,
              restaurants(name)
            `)
            .eq("resort_id", demoResortId)
            .eq("status", "OPEN")
            .gte("date", todayStr)
            .lte("date", next7Days)
            .order("date", { ascending: true });

          if (upcomingSlots?.length) {
            // Pick slots from different restaurants for variety
            const restaurantPicks = new Map<string, any>();
            
            for (const slot of upcomingSlots) {
              const restId = slot.restaurant_id;
              if (!restaurantPicks.has(restId) || restaurantPicks.size < 3) {
                restaurantPicks.set(`${restId}-${restaurantPicks.size}`, slot);
              }
              if (restaurantPicks.size >= 3) break;
            }
            
            const slotsToBook = [...restaurantPicks.values()].slice(0, 3);
            
            for (const slot of slotsToBook) {
              await supabase.from("restaurant_reservations").insert({
                resort_id: demoResortId,
                guest_id: demoPortalGuest.id,
                restaurant_slot_id: slot.id,
                room_number: demoPortalGuest.room_number,
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

    console.log(`Seeded bookings:`, results.seeded);

    // ============================================================
    // PASS 6: SERVICE REQUESTS - Ensure sample requests exist
    // ============================================================
    console.log("Pass 6: Auto-healing sample service requests...");

    // Count existing seed service requests
    const { count: seedRequestsCount } = await supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .eq("resort_id", demoResortId)
      .eq("origin", "seed");

    const needsRequests = (seedRequestsCount || 0) < 3;

    if (needsRequests && !isDryRun) {
      // Get room 101 guest (James Wilson - demo portal guest) for requests
      const { data: demoGuest } = await supabase
        .from("guests")
        .select("id, room_number")
        .eq("resort_id", demoResortId)
        .eq("room_number", "101")
        .lte("check_in_date", todayStr)
        .gte("check_out_date", todayStr)
        .single();

      if (demoGuest) {
        // Get catalog items
        const { data: catalogItems } = await supabase
          .from("request_catalog")
          .select("id, title, department_key")
          .eq("resort_id", demoResortId)
          .limit(10);

        if (catalogItems?.length && catalogItems.length >= 3) {
          const housekeepingItem = catalogItems.find(c => c.department_key === "HOUSEKEEPING");
          const minibarItem = catalogItems.find(c => c.department_key === "MINIBAR");
          const engineeringItem = catalogItems.find(c => c.department_key === "ENGINEERING") || catalogItems[2];

          if (housekeepingItem && minibarItem) {
            const now = new Date();
            const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

            // Helper: Generate context-aware sample note based on catalog item
            const getSampleNote = (item: any, department: string): string => {
              const title = (item.title || '').toLowerCase();
              
              if (department === 'MINIBAR') {
                if (title.includes('water')) return '2 bottles of still water please';
                if (title.includes('wine') || title.includes('champagne')) return 'Could we have a bottle chilled for tonight?';
                if (title.includes('refill')) return 'Full minibar restock please';
                return `Could we get some ${item.title} please?`;
              }
              
              if (department === 'HOUSEKEEPING') {
                if (title.includes('towel')) return 'Extra bath towels for 4 guests please';
                if (title.includes('linen') || title.includes('sheet')) return 'Fresh linens would be appreciated';
                if (title.includes('turndown')) return 'Turndown service at 7pm please';
                if (title.includes('cleaning') || title.includes('clean')) return 'Room cleaning when convenient';
                return 'Thank you!';
              }
              
              if (department === 'ENGINEERING') {
                if (title.includes('ac') || title.includes('air con')) return 'The AC seems to be making a strange noise';
                if (title.includes('light')) return 'The bathroom light is flickering';
                if (title.includes('tv')) return 'TV remote is not working';
                if (title.includes('wifi') || title.includes('internet')) return 'WiFi connection keeps dropping';
                if (title.includes('plumb') || title.includes('water') || title.includes('drain')) return 'Shower drain is slow';
                return `Issue with ${item.title} - needs attention`;
              }
              
              if (department === 'CONCIERGE') {
                return 'Could you help arrange this for us?';
              }
              
              return 'Thank you for your assistance!';
            };

            const sampleRequests = [
              {
                resort_id: demoResortId,
                guest_id: demoGuest.id,
                catalog_id: minibarItem.id,
                title: minibarItem.title,
                department_key: minibarItem.department_key,
                notes: getSampleNote(minibarItem, minibarItem.department_key),
                is_asap: true,
                priority: "NORMAL",
                status: "NEW",
                origin: "seed",
                created_at: thirtyMinAgo.toISOString(),
              },
              {
                resort_id: demoResortId,
                guest_id: demoGuest.id,
                catalog_id: housekeepingItem.id,
                title: housekeepingItem.title,
                department_key: housekeepingItem.department_key,
                notes: getSampleNote(housekeepingItem, housekeepingItem.department_key),
                is_asap: true,
                priority: "NORMAL",
                status: "IN_PROGRESS",
                origin: "seed",
                created_at: twoHoursAgo.toISOString(),
                acknowledged_at: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000).toISOString(),
                assigned_at: new Date(twoHoursAgo.getTime() + 10 * 60 * 1000).toISOString(),
              },
              {
                resort_id: demoResortId,
                guest_id: demoGuest.id,
                catalog_id: engineeringItem.id,
                title: engineeringItem.title,
                department_key: engineeringItem.department_key,
                notes: getSampleNote(engineeringItem, engineeringItem.department_key),
                internal_notes: "Issue resolved, all working now",
                is_asap: false,
                requested_for_at: new Date(fourHoursAgo.getTime() + 60 * 60 * 1000).toISOString(),
                priority: "HIGH",
                status: "COMPLETED",
                origin: "seed",
                created_at: fourHoursAgo.toISOString(),
                acknowledged_at: new Date(fourHoursAgo.getTime() + 3 * 60 * 1000).toISOString(),
                completed_at: new Date(fourHoursAgo.getTime() + 45 * 60 * 1000).toISOString(),
              },
            ];

            const { error } = await supabase
              .from("service_requests")
              .insert(sampleRequests);

            if (!error) {
              results.seeded.service_requests = sampleRequests.length;
            } else {
              console.error("Failed to seed service requests:", error);
            }
          }
        }
      }
    }

    console.log(`Service requests seeded: ${results.seeded.service_requests}`);

    // ============================================================
    // PASS 7: TRANSPORT - Seed stops, routes, buggies, drivers, requests
    // ============================================================
    console.log("Pass 7: Auto-healing transport infrastructure...");

    // Check if transport module is enabled
    const transportEnabled = demoResort.feature_flags?.transport_enabled ?? false;
    
    if (transportEnabled && !isDryRun) {
      // Count existing stops
      const { count: stopsCount } = await supabase
        .from("buggy_stops")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId);

      // Seed stops if needed (target: 15 stops)
      if ((stopsCount || 0) < 5) {
        const stopData = [
          // Main areas
          { name: "Main Reception", zone: "Central", sort_order: 1, is_active: true },
          { name: "Beach Bar", zone: "Beach", sort_order: 2, is_active: true },
          { name: "Sunset Restaurant", zone: "Beach", sort_order: 3, is_active: true },
          { name: "Overwater Spa", zone: "Spa", sort_order: 4, is_active: true },
          { name: "Dive Center", zone: "Water Sports", sort_order: 5, is_active: true },
          { name: "Water Sports Jetty", zone: "Water Sports", sort_order: 6, is_active: true },
          { name: "Kids Club", zone: "Central", sort_order: 7, is_active: true },
          { name: "Fitness Center", zone: "Central", sort_order: 8, is_active: true },
          // Villa zones
          { name: "Beach Villas - North", zone: "Beach Villas", sort_order: 10, is_active: true },
          { name: "Beach Villas - South", zone: "Beach Villas", sort_order: 11, is_active: true },
          { name: "Water Villas - Sunrise", zone: "Water Villas", sort_order: 12, is_active: true },
          { name: "Water Villas - Sunset", zone: "Water Villas", sort_order: 13, is_active: true },
          { name: "Garden Villas", zone: "Garden Villas", sort_order: 14, is_active: true },
          { name: "Pool Villas", zone: "Pool Villas", sort_order: 15, is_active: true },
          { name: "Presidential Suite", zone: "Premium", sort_order: 16, is_active: true },
        ].map(s => ({ ...s, resort_id: demoResortId }));

        const { data: insertedStops } = await supabase
          .from("buggy_stops")
          .upsert(stopData, { onConflict: "resort_id,name", ignoreDuplicates: true })
          .select();
        
        results.seeded.transport.stops = insertedStops?.length || 0;
      }

      // Get all stops for route creation
      const { data: allStops } = await supabase
        .from("buggy_stops")
        .select("id, name, zone")
        .eq("resort_id", demoResortId)
        .eq("is_active", true);

      // Count existing routes
      const { count: routesCount } = await supabase
        .from("buggy_routes")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId);

      // Seed routes if needed (target: 3 routes)
      if ((routesCount || 0) < 2 && allStops?.length) {
        const routeData = [
          { name: "Beach Circuit", color_tag: "#3B82F6", is_active: true },
          { name: "Villa Express", color_tag: "#10B981", is_active: true },
          { name: "Restaurant Shuttle", color_tag: "#F59E0B", is_active: true },
        ].map(r => ({ ...r, resort_id: demoResortId }));

        const { data: insertedRoutes } = await supabase
          .from("buggy_routes")
          .upsert(routeData, { onConflict: "resort_id,name", ignoreDuplicates: true })
          .select();

        results.seeded.transport.routes = insertedRoutes?.length || 0;
      }

      // Count existing buggies
      const { count: buggiesCount } = await supabase
        .from("buggies")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId);

      // Seed buggies if needed (target: 5 buggies)
      if ((buggiesCount || 0) < 3) {
        const buggyData = [
          { name: "Buggy Alpha", capacity: 4, status: "available", is_accessible: false },
          { name: "Buggy Beta", capacity: 6, status: "available", is_accessible: false },
          { name: "Buggy Gamma", capacity: 4, status: "available", is_accessible: true },
          { name: "Buggy Delta", capacity: 4, status: "in_use", is_accessible: false },
          { name: "Buggy Echo", capacity: 6, status: "available", is_accessible: false },
        ].map(b => ({ ...b, resort_id: demoResortId, metadata: {} }));

        const { data: insertedBuggies } = await supabase
          .from("buggies")
          .upsert(buggyData, { onConflict: "resort_id,name", ignoreDuplicates: true })
          .select();

        results.seeded.transport.buggies = insertedBuggies?.length || 0;
      }

      // Get staff users for driver assignment
      const { data: staffUsers } = await supabase
        .from("resort_memberships")
        .select("user_id, profiles!inner(display_name)")
        .eq("resort_id", demoResortId)
        .in("role", ["TRANSPORT", "STAFF", "MANAGER"])
        .limit(4);

      // Count existing drivers
      const { count: driversCount } = await supabase
        .from("buggy_drivers")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId);

      // Seed drivers if needed (target: 3 drivers)
      if ((driversCount || 0) < 2 && staffUsers?.length) {
        const driverData = staffUsers.slice(0, 3).map(u => ({
          resort_id: demoResortId,
          user_id: u.user_id,
          status: "online",
          metadata: {},
          last_seen_at: new Date().toISOString(),
        }));

        const { data: insertedDrivers } = await supabase
          .from("buggy_drivers")
          .upsert(driverData, { onConflict: "resort_id,user_id", ignoreDuplicates: true })
          .select();

        results.seeded.transport.drivers = insertedDrivers?.length || 0;
      }

      // Delete old demo buggy requests (older than 1 day)
      const yesterday = formatDate(addDays(today, -1));
      // First count, then delete
      const { count: oldRequestsCount } = await supabase
        .from("buggy_requests")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId)
        .lt("created_at", yesterday);
      
      if (oldRequestsCount && oldRequestsCount > 0) {
        await supabase
          .from("buggy_requests")
          .delete()
          .eq("resort_id", demoResortId)
          .lt("created_at", yesterday);
      }
      
      results.deleted.buggy_requests = oldRequestsCount || 0;

      // Count active buggy requests
      const { count: activeRequestsCount } = await supabase
        .from("buggy_requests")
        .select("id", { count: "exact", head: true })
        .eq("resort_id", demoResortId)
        .not("status", "in", "(completed,cancelled,failed)");

      // Seed sample requests if needed (target: 4 active requests)
      if ((activeRequestsCount || 0) < 2 && allStops?.length) {
        const { data: demoGuest } = await supabase
          .from("guests")
          .select("id, room_number, first_name, last_name")
          .eq("resort_id", demoResortId)
          .eq("room_number", "101")
          .lte("check_in_date", todayStr)
          .gte("check_out_date", todayStr)
          .single();

        const { data: otherGuest } = await supabase
          .from("guests")
          .select("id, room_number")
          .eq("resort_id", demoResortId)
          .eq("room_number", "102")
          .lte("check_in_date", todayStr)
          .gte("check_out_date", todayStr)
          .single();

        if (demoGuest && allStops.length >= 4) {
          const reception = allStops.find(s => s.name.includes("Reception"));
          const beach = allStops.find(s => s.name.includes("Beach Bar"));
          const spa = allStops.find(s => s.name.includes("Spa"));
          const dive = allStops.find(s => s.name.includes("Dive"));
          const restaurant = allStops.find(s => s.name.includes("Restaurant"));

          const sampleRequests = [
            // On-demand request - just created
            {
              resort_id: demoResortId,
              guest_id: demoGuest.id,
              request_type: "on_demand",
              request_source: "guest_app",
              pickup_stop_id: reception?.id || allStops[0].id,
              dropoff_stop_id: beach?.id || allStops[1].id,
              party_size: 2,
              status: "requested",
              priority: "normal",
              needs_accessible: false,
              created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
            },
            // Scheduled request for later today
            {
              resort_id: demoResortId,
              guest_id: demoGuest.id,
              request_type: "scheduled",
              request_source: "guest_app",
              pickup_stop_id: spa?.id || allStops[2].id,
              dropoff_stop_id: restaurant?.id || allStops[3].id,
              party_size: 4,
              status: "queued",
              priority: "normal",
              needs_accessible: false,
              scheduled_for: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
            },
          ];

          // Add request from other guest if exists
          if (otherGuest) {
            sampleRequests.push({
              resort_id: demoResortId,
              guest_id: otherGuest.id,
              request_type: "on_demand",
              request_source: "guest_app",
              pickup_stop_id: dive?.id || allStops[3].id,
              dropoff_stop_id: reception?.id || allStops[0].id,
              party_size: 1,
              status: "requested",
              priority: "high",
              needs_accessible: true,
              created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
            });
          }

          const { data: insertedRequests } = await supabase
            .from("buggy_requests")
            .insert(sampleRequests)
            .select();

          results.seeded.transport.requests = insertedRequests?.length || 0;
        }
      }
    }

    console.log(`Transport seeded:`, results.seeded.transport);

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
