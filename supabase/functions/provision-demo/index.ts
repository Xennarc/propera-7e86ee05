import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = "https://propera.cc";

const DEMO_ACTIVITIES = [
  { name: "House Reef Snorkel", category: "WATERSPORT", description: "Explore our vibrant house reef", short_description: "Guided snorkel tour", duration_minutes: 90, default_max_capacity: 8, default_price_per_person: 45, guest_can_book: true, guest_cutoff_hours: 2, requires_approval: false, difficulty_level: "EASY" },
  { name: "Intro Dive", category: "DIVE", description: "Perfect for beginners", short_description: "Beginner dive experience", duration_minutes: 180, default_max_capacity: 4, default_price_per_person: 150, guest_can_book: true, guest_cutoff_hours: 12, requires_approval: true, difficulty_level: "EASY" },
  { name: "Sunset Dolphin Cruise", category: "EXCURSION", description: "Watch dolphins at sunset", short_description: "Evening dolphin trip", duration_minutes: 120, default_max_capacity: 12, default_price_per_person: 85, guest_can_book: true, guest_cutoff_hours: 4, requires_approval: false, difficulty_level: "EASY" },
  { name: "Kayak Adventure", category: "WATERSPORT", description: "Explore the lagoon by kayak", short_description: "Self-guided kayak tour", duration_minutes: 60, default_max_capacity: 10, default_price_per_person: 35, guest_can_book: true, guest_cutoff_hours: 1, requires_approval: false, difficulty_level: "EASY" },
  { name: "Sunrise Yoga", category: "SPA", description: "Start your day with beachfront yoga", short_description: "Morning yoga session", duration_minutes: 60, default_max_capacity: 15, default_price_per_person: 25, guest_can_book: true, guest_cutoff_hours: 2, requires_approval: false, difficulty_level: "EASY" },
  { name: "Night Fishing", category: "EXCURSION", description: "Traditional Maldivian fishing experience", short_description: "Evening fishing trip", duration_minutes: 180, default_max_capacity: 8, default_price_per_person: 95, guest_can_book: true, guest_cutoff_hours: 6, requires_approval: false, difficulty_level: "EASY" },
  { name: "Deep Tissue Massage", category: "SPA", description: "Relaxing full body massage", short_description: "60-min massage", duration_minutes: 60, default_max_capacity: 2, default_price_per_person: 120, guest_can_book: true, guest_cutoff_hours: 4, requires_approval: false, difficulty_level: "EASY" },
  { name: "Advanced Reef Dive", category: "DIVE", description: "For certified divers", short_description: "2-tank dive trip", duration_minutes: 240, default_max_capacity: 6, default_price_per_person: 200, guest_can_book: true, guest_cutoff_hours: 12, requires_approval: true, difficulty_level: "INTERMEDIATE" },
];

const DEMO_RESTAURANTS = [
  { name: "Lagoon Restaurant", description: "Overwater dining with stunning views", total_capacity: 60, guest_can_book: true, guest_cutoff_minutes: 60, max_pax_per_booking: 8, requires_approval: false },
  { name: "Sunset Grill", description: "Beachfront BBQ and seafood", total_capacity: 40, guest_can_book: true, guest_cutoff_minutes: 120, max_pax_per_booking: 6, requires_approval: true },
  { name: "The Teppanyaki", description: "Japanese cuisine with live cooking", total_capacity: 24, guest_can_book: true, guest_cutoff_minutes: 180, max_pax_per_booking: 6, requires_approval: false },
];

const DEMO_GUESTS = [
  { full_name: "James Wilson", room_number: "101", nationality: "United Kingdom", daysFromNow: -2, stayLength: 7, email: "james.wilson@example.com" },
  { full_name: "Sarah Chen", room_number: "102", nationality: "Singapore", daysFromNow: -1, stayLength: 5, email: "sarah.chen@example.com" },
  { full_name: "Emma Miller", room_number: "201", nationality: "Australia", daysFromNow: 0, stayLength: 10, email: "emma.miller@example.com" },
  { full_name: "Hans Mueller", room_number: "202", nationality: "Germany", daysFromNow: 1, stayLength: 8, email: "hans.mueller@example.com" },
  { full_name: "Yuki Tanaka", room_number: "301", nationality: "Japan", daysFromNow: 2, stayLength: 6, email: "yuki.tanaka@example.com" },
];

const SAMPLE_BOOKING_NOTES = [
  "Celebrating honeymoon - please arrange special setup",
  "Guest has minor shellfish allergy",
  "First time diving, nervous but excited",
  "Anniversary dinner, requested window table",
  "Vegetarian meal preference",
  "Requested high chair for infant",
  "Would like photos during activity",
  null,
  null,
  null,
];

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate auto-login tokens for staff and guest
async function generateLoginTokens(
  supabase: any,
  workspaceId: string,
  resortId: string,
  staffUserId: string,
  guestId: string
): Promise<{ staffToken: string; guestToken: string }> {
  const staffToken = generateToken();
  const guestToken = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Delete any existing tokens for this workspace
  await supabase
    .from("demo_login_tokens")
    .delete()
    .eq("workspace_id", workspaceId);

  // Create new tokens
  await supabase.from("demo_login_tokens").insert([
    {
      workspace_id: workspaceId,
      token: staffToken,
      token_type: "staff",
      user_id: staffUserId,
      resort_id: resortId,
      expires_at: expiresAt,
    },
    {
      workspace_id: workspaceId,
      token: guestToken,
      token_type: "guest",
      guest_id: guestId,
      resort_id: resortId,
      expires_at: expiresAt,
    },
  ]);

  return { staffToken, guestToken };
}

// Validate staff login by attempting sign-in
async function validateStaffCredentials(
  supabase: any,
  email: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Credential validation failed:", error.message);
      return { valid: false, error: error.message };
    }
    
    // Sign out immediately - we just wanted to validate
    await supabase.auth.signOut();
    
    return { valid: true };
  } catch (err: any) {
    console.error("Credential validation error:", err);
    return { valid: false, error: err?.message || "Unknown error" };
  }
}

// Email sending helper
async function sendDemoEmail(params: {
  to: string;
  resortName: string;
  resortCode: string;
  staffIdentifier: string;
  tempPassword: string;
  guestInfo: { guestName: string; roomNumber: string; lastName: string; pin: string };
  staffToken?: string;
  guestToken?: string;
  isReminder?: boolean;
}): Promise<{ sent: boolean; error: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured");
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  const staffLoginUrl = params.staffToken 
    ? `${PRODUCTION_URL}/staff/demo-login?token=${params.staffToken}`
    : `${PRODUCTION_URL}/staff/auth?username=${encodeURIComponent(params.staffIdentifier)}`;
  
  const guestLoginUrl = params.guestToken
    ? `${PRODUCTION_URL}/guest/demo-login?token=${params.guestToken}`
    : `${PRODUCTION_URL}/resort/${params.resortCode}/guest/login?roomNumber=${encodeURIComponent(params.guestInfo.roomNumber)}&lastName=${encodeURIComponent(params.guestInfo.lastName)}`;

  const subject = params.isReminder 
    ? `🔑 Fresh login credentials for your ${params.resortName} demo`
    : `🎉 Your ${params.resortName} demo is ready!`;

  const introText = params.isReminder
    ? `Here are your fresh login credentials for <strong>${params.resortName}</strong>.`
    : `Your demo resort <strong>${params.resortName}</strong> is ready to explore.`;

  const tokenNote = params.staffToken 
    ? `<p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">⚡ The "Open" buttons below let you sign in instantly (expires in 15 min)</p>`
    : '';

  try {
    console.log("Sending demo email to:", params.to);
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Propera <noreply@propera.cc>",
        to: [params.to],
        subject,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 28px;">Welcome to Propera!</h1>
            <p style="color: #64748b; margin: 0; font-size: 16px;">${introText}</p>
            ${tokenNote}
          </div>

          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 18px;">👤 Staff Console Login</h2>
            <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Manage activities, sessions, guests, and view bookings.</p>
            <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.staffIdentifier}</code></p>
              <p style="margin: 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${params.tempPassword}</code></p>
            </div>
            <a href="${staffLoginUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Staff Console →</a>
          </div>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
            <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px;">🏝️ Guest Portal Login</h2>
            <p style="color: #047857; margin: 0 0 16px; font-size: 14px;">Experience booking from the guest's perspective.</p>
            <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #a7f3d0;">
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Guest:</strong> ${params.guestInfo.guestName}</p>
              <p style="margin: 0 0 8px; font-size: 14px;"><strong>Room:</strong> ${params.guestInfo.roomNumber}</p>
              <p style="margin: 0; font-size: 14px;"><strong>PIN:</strong> <code style="background: #ecfdf5; padding: 2px 6px; border-radius: 4px; font-size: 16px; letter-spacing: 2px; font-family: monospace;">${params.guestInfo.pin}</code></p>
            </div>
            <a href="${guestLoginUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Guest Portal →</a>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">Your demo expires in <strong>14 days</strong>. Upgrade anytime to keep your data!</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">Questions? Reply to this email or visit <a href="${PRODUCTION_URL}" style="color: #2563eb;">propera.cc</a></p>
          </div>
        </div>
      `,
      }),
    });

    const responseText = await emailRes.text();
    console.log("Resend response:", emailRes.status, responseText);

    if (emailRes.ok) {
      return { sent: true, error: "" };
    } else {
      return { sent: false, error: responseText };
    }
  } catch (err: any) {
    console.error("Email send error:", err);
    return { sent: false, error: err?.message || "Unknown email error" };
  }
}

// Rotate credentials for existing demo
async function rotateCredentials(
  supabaseAdmin: any,
  workspaceId: string,
  resortId: string,
  resortCode: string
): Promise<{
  staffIdentifier: string;
  tempPassword: string;
  staffUserId: string;
  guestInfo: { guestId: string; guestName: string; roomNumber: string; lastName: string; pin: string };
  validated: boolean;
}> {
  const tempPassword = generatePassword();
  
  // Find the existing demo admin for this resort
  const { data: membership } = await supabaseAdmin
    .from("resort_memberships")
    .select("user_id")
    .eq("resort_id", resortId)
    .eq("resort_role", "RESORT_ADMIN")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!membership) {
    throw new Error("No admin found for this demo resort");
  }

  const { data: { user: existingUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
  
  if (getUserError || !existingUser) {
    throw new Error("Failed to find admin user");
  }

  console.log("Resetting password for existing admin:", existingUser.email);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(membership.user_id, {
    password: tempPassword,
  });

  if (updateError) {
    console.error("Failed to reset admin password:", updateError);
    throw new Error("Failed to reset admin password");
  }

  const staffIdentifier = existingUser.email;
  console.log("Password reset for:", staffIdentifier);

  // Validate credentials work
  const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);
  console.log("Credential validation result:", validation);

  // Refresh demo data
  await refreshDemoData(supabaseAdmin, resortId);

  // Rotate guest PIN
  const { data: demoGuest } = await supabaseAdmin
    .from("guests")
    .select("id, full_name, room_number")
    .eq("resort_id", resortId)
    .eq("room_number", "201")
    .eq("portal_enabled", true)
    .single();

  let guestInfo = {
    guestId: "",
    guestName: "Demo Guest",
    roomNumber: "101",
    lastName: "Guest",
    pin: "0000",
  };

  if (demoGuest) {
    const newPin = generatePin();
    const pinHash = await hashPin(newPin);
    await supabaseAdmin.from("guests").update({
      portal_pin_hash: pinHash,
      portal_pin_last4: newPin,
      portal_pin_set_at: new Date().toISOString(),
    }).eq("id", demoGuest.id);
    
    guestInfo.pin = newPin;
    guestInfo.guestId = demoGuest.id;

    const nameParts = demoGuest.full_name.split(" ");
    guestInfo.guestName = demoGuest.full_name;
    guestInfo.roomNumber = demoGuest.room_number;
    guestInfo.lastName = nameParts[nameParts.length - 1];
    
    console.log("Guest PIN rotated for:", demoGuest.full_name);
  }

  // Update workspace
  await supabaseAdmin.from("demo_workspaces").update({
    staff_email: staffIdentifier,
    guest_id: guestInfo.guestId || null,
    guest_room: guestInfo.roomNumber,
    guest_last_name: guestInfo.lastName,
  }).eq("id", workspaceId);

  return {
    staffIdentifier,
    tempPassword,
    staffUserId: membership.user_id,
    guestInfo,
    validated: validation.valid,
  };
}

// Refresh demo data
async function refreshDemoData(supabase: any, resortId: string): Promise<void> {
  const today = new Date();
  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(addDays(today, -1));

  console.log("Refreshing demo data for resort:", resortId);

  // Delete stale activity sessions
  const { data: staleSessions } = await supabase
    .from("activity_sessions")
    .select("id")
    .eq("resort_id", resortId)
    .lt("date", yesterdayStr);

  if (staleSessions?.length) {
    const staleSessionIds = staleSessions.map((s: any) => s.id);
    await supabase.from("activity_bookings").delete().in("session_id", staleSessionIds);
    await supabase.from("activity_sessions").delete().in("id", staleSessionIds);
    console.log(`Deleted ${staleSessions.length} stale sessions`);
  }

  // Delete stale restaurant slots
  const { data: staleSlots } = await supabase
    .from("restaurant_time_slots")
    .select("id")
    .eq("resort_id", resortId)
    .lt("date", yesterdayStr);

  if (staleSlots?.length) {
    const staleSlotIds = staleSlots.map((s: any) => s.id);
    await supabase.from("restaurant_reservations").delete().in("restaurant_slot_id", staleSlotIds);
    await supabase.from("restaurant_time_slots").delete().in("id", staleSlotIds);
    console.log(`Deleted ${staleSlots.length} stale restaurant slots`);
  }

  // Get existing activities
  const { data: activities } = await supabase
    .from("activities")
    .select("id, default_max_capacity")
    .eq("resort_id", resortId);

  // Find furthest date with sessions
  const { data: latestSession } = await supabase
    .from("activity_sessions")
    .select("date")
    .eq("resort_id", resortId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const lastExistingDate = latestSession?.date ? new Date(latestSession.date) : addDays(today, -1);
  const daysToAdd = Math.max(0, 14 - Math.ceil((lastExistingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  if (activities?.length && daysToAdd > 0) {
    const sessions: any[] = [];
    const startDay = Math.ceil((lastExistingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let day = startDay; day <= startDay + daysToAdd; day++) {
      const sessionDate = formatDate(addDays(today, day));
      activities.forEach((activity: any) => {
        sessions.push({
          resort_id: resortId,
          activity_id: activity.id,
          date: sessionDate,
          start_time: "09:00",
          end_time: "10:30",
          capacity: activity.default_max_capacity,
          status: "SCHEDULED",
        });
        if (day % 2 === 0) {
          sessions.push({
            resort_id: resortId,
            activity_id: activity.id,
            date: sessionDate,
            start_time: "14:00",
            end_time: "15:30",
            capacity: activity.default_max_capacity,
            status: "SCHEDULED",
          });
        }
      });
    }
    
    if (sessions.length) {
      await supabase.from("activity_sessions").insert(sessions);
      console.log(`Created ${sessions.length} new activity sessions`);
    }
  }

  // Refresh restaurant slots
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, total_capacity")
    .eq("resort_id", resortId);

  const { data: latestSlot } = await supabase
    .from("restaurant_time_slots")
    .select("date")
    .eq("resort_id", resortId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  const lastExistingSlotDate = latestSlot?.date ? new Date(latestSlot.date) : addDays(today, -1);
  const slotDaysToAdd = Math.max(0, 14 - Math.ceil((lastExistingSlotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  if (restaurants?.length && slotDaysToAdd > 0) {
    const slots: any[] = [];
    const startDay = Math.ceil((lastExistingSlotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let day = startDay; day <= startDay + slotDaysToAdd; day++) {
      const slotDate = formatDate(addDays(today, day));
      restaurants.forEach((restaurant: any) => {
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "07:00", end_time: "10:00", meal_period: "BREAKFAST", capacity: restaurant.total_capacity, status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "12:00", end_time: "14:30", meal_period: "LUNCH", capacity: Math.floor(restaurant.total_capacity * 0.7), status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "19:00", end_time: "20:30", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
        slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "20:30", end_time: "22:00", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
      });
    }
    
    if (slots.length) {
      await supabase.from("restaurant_time_slots").insert(slots);
      console.log(`Created ${slots.length} new restaurant slots`);
    }
  }

  // Update guest dates
  const { data: existingGuests } = await supabase
    .from("guests")
    .select("id, room_number")
    .eq("resort_id", resortId);

  if (existingGuests?.length) {
    for (const guest of existingGuests) {
      const template = DEMO_GUESTS.find(g => g.room_number === guest.room_number);
      if (template) {
        await supabase.from("guests").update({
          check_in_date: formatDate(addDays(today, template.daysFromNow)),
          check_out_date: formatDate(addDays(today, template.daysFromNow + template.stayLength)),
          updated_at: new Date().toISOString(),
        }).eq("id", guest.id);
      }
    }
    console.log(`Updated ${existingGuests.length} guest dates`);
  }

  console.log("Demo data refresh complete");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, resort_name, timezone, rooms_range, departments, mode = "provision" } = body;

    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Demo request:", { email, resort_name, mode });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // MODE: regenerate-credentials - rotate password/PIN and generate new tokens
    if (mode === "regenerate-credentials") {
      console.log("Regenerate credentials mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rotated = await rotateCredentials(supabaseAdmin, workspace.id, workspace.resort_id, workspace.resort_code);
      
      // Generate new login tokens
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        workspace.resort_id,
        rotated.staffUserId,
        rotated.guestInfo.guestId
      );

      const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
      const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

      // Send email
      const emailResult = await sendDemoEmail({
        to: email,
        resortName: workspace.resort_name,
        resortCode: workspace.resort_code,
        staffIdentifier: rotated.staffIdentifier,
        tempPassword: rotated.tempPassword,
        guestInfo: rotated.guestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        regenerated: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
        resort_code: workspace.resort_code,
        staff_email: rotated.staffIdentifier,
        temp_password: rotated.tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: rotated.guestInfo.guestName,
          room_number: rotated.guestInfo.roomNumber,
          last_name: rotated.guestInfo.lastName,
          pin: rotated.guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        credentials_validated: rotated.validated,
        email_sent: emailResult.sent,
        expires_at: workspace.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: reseed - re-run data seeding
    if (mode === "reseed") {
      console.log("Reseed mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await refreshDemoData(supabaseAdmin, workspace.resort_id);
      
      await supabaseAdmin.from("demo_workspaces").update({
        seeded_at: new Date().toISOString(),
      }).eq("id", workspace.id);

      return new Response(JSON.stringify({
        success: true,
        reseeded: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: generate-tokens - generate new login tokens without changing credentials
    if (mode === "generate-tokens") {
      console.log("Generate tokens mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        workspace.resort_id,
        workspace.staff_user_id,
        workspace.guest_id
      );

      return new Response(JSON.stringify({
        success: true,
        workspace_id: workspace.id,
        staff_token: tokens.staffToken,
        guest_token: tokens.guestToken,
        staff_login_url: `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`,
        guest_login_url: `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: get-workspace - fetch existing workspace for resume
    if (mode === "get-workspace") {
      console.log("Get workspace mode for:", email);

      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!workspace) {
        return new Response(JSON.stringify({ success: false, found: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        found: true,
        workspace_id: workspace.id,
        resort_id: workspace.resort_id,
        resort_code: workspace.resort_code,
        resort_name: workspace.resort_name,
        staff_email: workspace.staff_email,
        guest_room: workspace.guest_room,
        guest_last_name: workspace.guest_last_name,
        expires_at: workspace.expires_at,
        created_at: workspace.created_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: resend (legacy) - same as regenerate-credentials
    if (mode === "resend") {
      console.log("Resend mode (legacy) for:", email);
      
      // Check demo_workspaces first
      const { data: workspace } = await supabaseAdmin
        .from("demo_workspaces")
        .select("*")
        .eq("email", email.toLowerCase())
        .eq("status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (workspace) {
        // Use new flow
        const rotated = await rotateCredentials(supabaseAdmin, workspace.id, workspace.resort_id, workspace.resort_code);
        
        const tokens = await generateLoginTokens(
          supabaseAdmin,
          workspace.id,
          workspace.resort_id,
          rotated.staffUserId,
          rotated.guestInfo.guestId
        );

        const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
        const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

        const emailResult = await sendDemoEmail({
          to: email,
          resortName: workspace.resort_name,
          resortCode: workspace.resort_code,
          staffIdentifier: rotated.staffIdentifier,
          tempPassword: rotated.tempPassword,
          guestInfo: rotated.guestInfo,
          staffToken: tokens.staffToken,
          guestToken: tokens.guestToken,
          isReminder: true,
        });

        return new Response(JSON.stringify({
          success: true,
          existing: true,
          workspace_id: workspace.id,
          tenant_id: workspace.resort_id,
          resort_code: workspace.resort_code,
          email: rotated.staffIdentifier,
          temp_password: rotated.tempPassword,
          staff_login_url: staffLoginUrl,
          staff_token: tokens.staffToken,
          guest_login: {
            guest_name: rotated.guestInfo.guestName,
            room_number: rotated.guestInfo.roomNumber,
            last_name: rotated.guestInfo.lastName,
            pin: rotated.guestInfo.pin,
            portal_url: guestLoginUrl,
          },
          guest_token: tokens.guestToken,
          email_sent: emailResult.sent,
          credentials_validated: rotated.validated,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback to old flow for legacy demos
      const { data: existingLead } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (!existingLead) {
        return new Response(JSON.stringify({ success: false, error: "No demo found for this email" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingDemo } = await supabaseAdmin
        .from("demo_tenants")
        .select("id, tenant_id, expires_at")
        .eq("lead_id", existingLead.id)
        .eq("is_converted", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!existingDemo) {
        return new Response(JSON.stringify({ success: false, error: "No active demo found. Please create a new demo." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: resort } = await supabaseAdmin
        .from("resorts")
        .select("code, name")
        .eq("id", existingDemo.tenant_id)
        .single();

      if (!resort) {
        return new Response(JSON.stringify({ success: false, error: "Demo resort not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create a workspace record for this legacy demo
      const { data: newWorkspace } = await supabaseAdmin
        .from("demo_workspaces")
        .insert({
          email: email.toLowerCase(),
          resort_name: resort.name,
          resort_id: existingDemo.tenant_id,
          resort_code: resort.code,
          status: "ready",
          expires_at: existingDemo.expires_at,
        })
        .select()
        .single();

      const tempPassword = generatePassword();
      
      // Find and reset admin password
      const { data: membership } = await supabaseAdmin
        .from("resort_memberships")
        .select("user_id")
        .eq("resort_id", existingDemo.tenant_id)
        .eq("resort_role", "RESORT_ADMIN")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (!membership) {
        throw new Error("No admin found for this demo resort");
      }

      const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
      
      await supabaseAdmin.auth.admin.updateUserById(membership.user_id, { password: tempPassword });

      const staffIdentifier = existingUser?.email || email;

      // Validate credentials
      const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);

      await refreshDemoData(supabaseAdmin, existingDemo.tenant_id);

      // Get or create guest PIN
      const { data: demoGuest } = await supabaseAdmin
        .from("guests")
        .select("id, full_name, room_number")
        .eq("resort_id", existingDemo.tenant_id)
        .eq("room_number", "201")
        .eq("portal_enabled", true)
        .single();

      let guestInfo = { guestId: "", guestName: "Demo Guest", roomNumber: "101", lastName: "Guest", pin: "0000" };

      if (demoGuest) {
        const newPin = generatePin();
        const pinHash = await hashPin(newPin);
        await supabaseAdmin.from("guests").update({
          portal_pin_hash: pinHash,
          portal_pin_last4: newPin,
          portal_pin_set_at: new Date().toISOString(),
        }).eq("id", demoGuest.id);
        
        guestInfo.pin = newPin;
        guestInfo.guestId = demoGuest.id;
        const nameParts = demoGuest.full_name.split(" ");
        guestInfo.guestName = demoGuest.full_name;
        guestInfo.roomNumber = demoGuest.room_number;
        guestInfo.lastName = nameParts[nameParts.length - 1];
      }

      // Update workspace
      if (newWorkspace) {
        await supabaseAdmin.from("demo_workspaces").update({
          staff_user_id: membership.user_id,
          staff_email: staffIdentifier,
          guest_id: guestInfo.guestId || null,
          guest_room: guestInfo.roomNumber,
          guest_last_name: guestInfo.lastName,
        }).eq("id", newWorkspace.id);

        // Generate tokens
        const tokens = await generateLoginTokens(
          supabaseAdmin,
          newWorkspace.id,
          existingDemo.tenant_id,
          membership.user_id,
          guestInfo.guestId
        );

        const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
        const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

        const emailResult = await sendDemoEmail({
          to: email,
          resortName: resort.name,
          resortCode: resort.code,
          staffIdentifier,
          tempPassword,
          guestInfo,
          staffToken: tokens.staffToken,
          guestToken: tokens.guestToken,
          isReminder: true,
        });

        return new Response(JSON.stringify({
          success: true,
          existing: true,
          workspace_id: newWorkspace.id,
          tenant_id: existingDemo.tenant_id,
          resort_code: resort.code,
          email: staffIdentifier,
          temp_password: tempPassword,
          staff_login_url: staffLoginUrl,
          staff_token: tokens.staffToken,
          guest_login: {
            guest_name: guestInfo.guestName,
            room_number: guestInfo.roomNumber,
            last_name: guestInfo.lastName,
            pin: guestInfo.pin,
            portal_url: guestLoginUrl,
          },
          guest_token: tokens.guestToken,
          email_sent: emailResult.sent,
          credentials_validated: validation.valid,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fallback without tokens
      const staffLoginUrl = `${PRODUCTION_URL}/staff/auth?username=${encodeURIComponent(staffIdentifier)}`;
      const guestLoginUrl = `${PRODUCTION_URL}/resort/${resort.code}/guest/login?roomNumber=${encodeURIComponent(guestInfo.roomNumber)}&lastName=${encodeURIComponent(guestInfo.lastName)}`;

      const emailResult = await sendDemoEmail({
        to: email,
        resortName: resort.name,
        resortCode: resort.code,
        staffIdentifier,
        tempPassword,
        guestInfo,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        existing: true,
        tenant_id: existingDemo.tenant_id,
        resort_code: resort.code,
        email: staffIdentifier,
        temp_password: tempPassword,
        staff_login_url: staffLoginUrl,
        guest_login: {
          guest_name: guestInfo.guestName,
          room_number: guestInfo.roomNumber,
          last_name: guestInfo.lastName,
          pin: guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        email_sent: emailResult.sent,
        credentials_validated: validation.valid,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === PROVISION MODE (default) ===
    if (!resort_name) {
      return new Response(JSON.stringify({ success: false, error: "Resort name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Provision mode for:", email, resort_name, "departments:", departments);

    // Check for existing workspace first
    const { data: existingWorkspace } = await supabaseAdmin
      .from("demo_workspaces")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("status", "ready")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingWorkspace) {
      console.log("Existing workspace found - regenerating credentials");
      
      const rotated = await rotateCredentials(supabaseAdmin, existingWorkspace.id, existingWorkspace.resort_id, existingWorkspace.resort_code);
      
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        existingWorkspace.id,
        existingWorkspace.resort_id,
        rotated.staffUserId,
        rotated.guestInfo.guestId
      );

      const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
      const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

      const emailResult = await sendDemoEmail({
        to: email,
        resortName: existingWorkspace.resort_name,
        resortCode: existingWorkspace.resort_code,
        staffIdentifier: rotated.staffIdentifier,
        tempPassword: rotated.tempPassword,
        guestInfo: rotated.guestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: true,
      });

      return new Response(JSON.stringify({
        success: true,
        existing: true,
        workspace_id: existingWorkspace.id,
        tenant_id: existingWorkspace.resort_id,
        resort_code: existingWorkspace.resort_code,
        email: rotated.staffIdentifier,
        temp_password: rotated.tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: rotated.guestInfo.guestName,
          room_number: rotated.guestInfo.roomNumber,
          last_name: rotated.guestInfo.lastName,
          pin: rotated.guestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        email_sent: emailResult.sent,
        credentials_validated: rotated.validated,
        message: "You already have an active demo - fresh credentials generated!",
        expires_at: existingWorkspace.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const emailDomain = email.split("@")[1];
    const { data: rateLimit } = await supabaseAdmin
      .from("demo_rate_limits")
      .select("*")
      .eq("email_domain", emailDomain)
      .single();

    if (rateLimit) {
      const lastAttempt = new Date(rateLimit.last_attempt_at);
      const hoursSince = (Date.now() - lastAttempt.getTime()) / (1000 * 60 * 60);

      if (hoursSince < 24 && rateLimit.attempts >= 3) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("demo_rate_limits")
        .update({ attempts: hoursSince < 24 ? rateLimit.attempts + 1 : 1, last_attempt_at: new Date().toISOString() })
        .eq("id", rateLimit.id);
    } else {
      await supabaseAdmin.from("demo_rate_limits").insert({ email_domain: emailDomain });
    }

    // Create workspace record first (status: creating)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("demo_workspaces")
      .insert({
        email: email.toLowerCase(),
        resort_name,
        timezone: timezone || "UTC",
        rooms_range,
        departments: departments || [],
        status: "creating",
      })
      .select()
      .single();

    if (workspaceError) {
      throw workspaceError;
    }

    try {
      // Check for existing lead
      let leadId: string;
      const { data: existingLead } = await supabaseAdmin
        .from("leads")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .single();

      if (existingLead) {
        leadId = existingLead.id;
        
        // Check for existing demo tenant
        const { data: existingDemo } = await supabaseAdmin
          .from("demo_tenants")
          .select("id, tenant_id, expires_at")
          .eq("lead_id", leadId)
          .eq("is_converted", false)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (existingDemo) {
          console.log("Existing demo tenant found");
          
          const { data: existingResort } = await supabaseAdmin
            .from("resorts")
            .select("code, name")
            .eq("id", existingDemo.tenant_id)
            .single();

          // Update workspace to point to existing resort
          await supabaseAdmin.from("demo_workspaces").update({
            resort_id: existingDemo.tenant_id,
            resort_code: existingResort?.code,
            resort_name: existingResort?.name || resort_name,
            expires_at: existingDemo.expires_at,
          }).eq("id", workspace.id);

          // Find admin and rotate credentials
          const { data: membership } = await supabaseAdmin
            .from("resort_memberships")
            .select("user_id")
            .eq("resort_id", existingDemo.tenant_id)
            .eq("resort_role", "RESORT_ADMIN")
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (!membership) {
            throw new Error("No admin found for existing demo");
          }

          const tempPassword = generatePassword();
          const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
          await supabaseAdmin.auth.admin.updateUserById(membership.user_id, { password: tempPassword });
          
          const staffIdentifier = existingUser?.email || email;

          // Validate credentials
          const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);

          await refreshDemoData(supabaseAdmin, existingDemo.tenant_id);

          // Get demo guest
          const { data: demoGuest } = await supabaseAdmin
            .from("guests")
            .select("id, full_name, room_number")
            .eq("resort_id", existingDemo.tenant_id)
            .eq("room_number", "201")
            .eq("portal_enabled", true)
            .single();

          let guestInfo = { guestId: "", guestName: "Demo Guest", roomNumber: "101", lastName: "Guest", pin: "0000" };

          if (demoGuest) {
            const newPin = generatePin();
            const pinHash = await hashPin(newPin);
            await supabaseAdmin.from("guests").update({
              portal_pin_hash: pinHash,
              portal_pin_last4: newPin,
              portal_pin_set_at: new Date().toISOString(),
            }).eq("id", demoGuest.id);
            
            guestInfo.pin = newPin;
            guestInfo.guestId = demoGuest.id;
            const nameParts = demoGuest.full_name.split(" ");
            guestInfo.guestName = demoGuest.full_name;
            guestInfo.roomNumber = demoGuest.room_number;
            guestInfo.lastName = nameParts[nameParts.length - 1];
          }

          // Update workspace
          await supabaseAdmin.from("demo_workspaces").update({
            staff_user_id: membership.user_id,
            staff_email: staffIdentifier,
            guest_id: guestInfo.guestId || null,
            guest_room: guestInfo.roomNumber,
            guest_last_name: guestInfo.lastName,
            status: "ready",
            seeded_at: new Date().toISOString(),
          }).eq("id", workspace.id);

          // Generate tokens
          const tokens = await generateLoginTokens(
            supabaseAdmin,
            workspace.id,
            existingDemo.tenant_id,
            membership.user_id,
            guestInfo.guestId
          );

          const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
          const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

          const emailResult = await sendDemoEmail({
            to: email,
            resortName: existingResort?.name || resort_name,
            resortCode: existingResort?.code || "",
            staffIdentifier,
            tempPassword,
            guestInfo,
            staffToken: tokens.staffToken,
            guestToken: tokens.guestToken,
            isReminder: true,
          });

          return new Response(JSON.stringify({
            success: true,
            existing: true,
            workspace_id: workspace.id,
            tenant_id: existingDemo.tenant_id,
            resort_code: existingResort?.code,
            email: staffIdentifier,
            temp_password: tempPassword,
            staff_login_url: staffLoginUrl,
            staff_token: tokens.staffToken,
            guest_login: {
              guest_name: guestInfo.guestName,
              room_number: guestInfo.roomNumber,
              last_name: guestInfo.lastName,
              pin: guestInfo.pin,
              portal_url: guestLoginUrl,
            },
            guest_token: tokens.guestToken,
            email_sent: emailResult.sent,
            credentials_validated: validation.valid,
            message: "You already have an active demo - fresh credentials generated!",
            expires_at: existingDemo.expires_at,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("leads")
          .update({ resort_name, timezone, rooms_range, departments, status: "sandbox_created", updated_at: new Date().toISOString() })
          .eq("id", leadId);
      } else {
        const { data: newLead, error: leadError } = await supabaseAdmin
          .from("leads")
          .insert({
            email: email.toLowerCase(),
            resort_name,
            timezone,
            rooms_range,
            departments,
            status: "sandbox_created",
            lead_score: 10,
          })
          .select()
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Generate unique resort code
      const baseCode = resort_name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() || "DEMO";
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const resortCode = `${baseCode}${randomSuffix}`;

      // Create the demo resort
      const { data: resort, error: resortError } = await supabaseAdmin
        .from("resorts")
        .insert({
          name: resort_name,
          code: resortCode,
          timezone: timezone || "UTC",
          currency: "USD",
          status: "ACTIVE",
          is_demo: true,
          subscription_tier: "ESSENTIAL",
          onboarding_status: "NOT_STARTED",
        })
        .select()
        .single();

      if (resortError) throw resortError;
      console.log("Resort created:", resort.id, "code:", resortCode);

      // Create demo tenant record
      const expiresAt = addDays(new Date(), 14);
      await supabaseAdmin.from("demo_tenants").insert({
        lead_id: leadId,
        tenant_id: resort.id,
        expires_at: expiresAt.toISOString(),
      });

      // Generate admin credentials
      const tempPassword = generatePassword();
      const emailParts = email.split("@");
      const demoEmail = `${emailParts[0]}+${resortCode.toLowerCase()}@${emailParts[1]}`;
      const username = emailParts[0].toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20) + ".demo";

      let userId: string;
      let staffIdentifier: string;

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: demoEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: "Demo Admin", must_reset_password: false },
      });

      if (authError) {
        console.error("Auth user creation error:", authError);
        const { data: fallbackUser, error: fallbackError } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: "Demo Admin", must_reset_password: false },
        });

        if (fallbackError) {
          if (fallbackError.message.includes("already been registered")) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find((u: any) => u.email === email.toLowerCase());
            
            if (existingUser) {
              userId = existingUser.id;
              staffIdentifier = email;
              
              // Reset password for existing user
              await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: tempPassword });
              
              await supabaseAdmin.from("resort_memberships").insert({
                user_id: existingUser.id,
                resort_id: resort.id,
                resort_role: "RESORT_ADMIN",
              });
            } else {
              throw fallbackError;
            }
          } else {
            throw fallbackError;
          }
        } else {
          userId = fallbackUser.user.id;
          staffIdentifier = email;

          await supabaseAdmin.from("profiles").upsert({
            id: userId,
            username,
            full_name: "Demo Admin",
            global_role: "STANDARD",
          });

          await supabaseAdmin.from("resort_memberships").insert({
            user_id: userId,
            resort_id: resort.id,
            resort_role: "RESORT_ADMIN",
          });
        }
      } else {
        userId = authUser.user.id;
        staffIdentifier = demoEmail;

        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          username,
          full_name: "Demo Admin",
          global_role: "STANDARD",
        });

        await supabaseAdmin.from("resort_memberships").insert({
          user_id: userId,
          resort_id: resort.id,
          resort_role: "RESORT_ADMIN",
        });
      }

      console.log("Admin user setup complete:", userId, "identifier:", staffIdentifier);

      // Validate credentials work
      const validation = await validateStaffCredentials(supabaseAdmin, staffIdentifier, tempPassword);
      console.log("Credential validation:", validation);

      // Seed demo data
      const demoGuestInfo = await seedDemoData(supabaseAdmin, resort.id, departments || [], resortCode);
      console.log("Demo data seeded, guest info:", demoGuestInfo);

      // Update workspace
      await supabaseAdmin.from("demo_workspaces").update({
        resort_id: resort.id,
        resort_code: resortCode,
        staff_user_id: userId,
        staff_email: staffIdentifier,
        guest_id: demoGuestInfo.guestId || null,
        guest_room: demoGuestInfo.roomNumber,
        guest_last_name: demoGuestInfo.lastName,
        status: "ready",
        seeded_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }).eq("id", workspace.id);

      // Generate login tokens
      const tokens = await generateLoginTokens(
        supabaseAdmin,
        workspace.id,
        resort.id,
        userId,
        demoGuestInfo.guestId || ""
      );

      const staffLoginUrl = `${PRODUCTION_URL}/staff/demo-login?token=${tokens.staffToken}`;
      const guestLoginUrl = `${PRODUCTION_URL}/guest/demo-login?token=${tokens.guestToken}`;

      // Log event
      await supabaseAdmin.from("lead_events").insert({
        lead_id: leadId,
        event_type: "demo_created",
        meta: { resort_id: resort.id, user_id: userId, workspace_id: workspace.id },
      });

      // Send welcome email
      const emailResult = await sendDemoEmail({
        to: email,
        resortName: resort_name,
        resortCode: resortCode,
        staffIdentifier,
        tempPassword,
        guestInfo: demoGuestInfo,
        staffToken: tokens.staffToken,
        guestToken: tokens.guestToken,
        isReminder: false,
      });

      console.log("Demo provisioning complete");
      
      return new Response(JSON.stringify({
        success: true,
        workspace_id: workspace.id,
        tenant_id: resort.id,
        resort_code: resortCode,
        email: staffIdentifier,
        temp_password: tempPassword,
        staff_login_url: staffLoginUrl,
        staff_token: tokens.staffToken,
        guest_login: {
          guest_name: demoGuestInfo.guestName,
          room_number: demoGuestInfo.roomNumber,
          last_name: demoGuestInfo.lastName,
          pin: demoGuestInfo.pin,
          portal_url: guestLoginUrl,
        },
        guest_token: tokens.guestToken,
        email_sent: emailResult.sent,
        credentials_validated: validation.valid,
        expires_at: expiresAt.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (provisionError: any) {
      console.error("Provision error:", provisionError);
      
      // Update workspace with error
      await supabaseAdmin.from("demo_workspaces").update({
        status: "failed",
        last_error: provisionError?.message || "Unknown error",
      }).eq("id", workspace.id);

      throw provisionError;
    }

  } catch (error: any) {
    console.error("Provision demo error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function seedDemoData(supabase: any, resortId: string, departments: string[], resortCode: string): Promise<{ guestId: string; guestName: string; roomNumber: string; lastName: string; pin: string }> {
  const today = new Date();

  const deptMap: Record<string, string[]> = {
    dive: ["DIVE"],
    watersports: ["WATERSPORT"],
    spa: ["SPA"],
    excursions: ["EXCURSION"],
  };

  const activitiesToSeed = departments.length === 0 
    ? DEMO_ACTIVITIES 
    : DEMO_ACTIVITIES.filter((a) => departments.some((dept) => deptMap[dept]?.includes(a.category)));

  const finalActivities = activitiesToSeed.length > 0 ? activitiesToSeed : DEMO_ACTIVITIES.slice(0, 3);

  console.log("Seeding activities:", finalActivities.map(a => a.name));

  const { data: activities, error: actError } = await supabase
    .from("activities")
    .insert(finalActivities.map((a) => ({ ...a, resort_id: resortId })))
    .select();

  if (actError) console.error("Error creating activities:", actError);

  let allSessions: any[] = [];
  if (activities?.length) {
    const sessions: any[] = [];
    for (let day = 0; day <= 14; day++) {
      const sessionDate = formatDate(addDays(today, day));
      activities.forEach((activity: any) => {
        sessions.push({
          resort_id: resortId,
          activity_id: activity.id,
          date: sessionDate,
          start_time: "09:00",
          end_time: "10:30",
          capacity: activity.default_max_capacity,
          status: "SCHEDULED",
        });
        if (day % 2 === 0) {
          sessions.push({
            resort_id: resortId,
            activity_id: activity.id,
            date: sessionDate,
            start_time: "14:00",
            end_time: "15:30",
            capacity: activity.default_max_capacity,
            status: "SCHEDULED",
          });
        }
      });
    }
    const { data: createdSessions, error: sessError } = await supabase.from("activity_sessions").insert(sessions).select();
    if (sessError) console.error("Error creating sessions:", sessError);
    else {
      console.log("Created", sessions.length, "activity sessions");
      allSessions = createdSessions || [];
    }
  }

  const shouldSeedDining = departments.length === 0 || departments.includes("dining");
  let allSlots: any[] = [];
  
  if (shouldSeedDining) {
    console.log("Seeding restaurants and time slots");
    const { data: restaurants, error: restError } = await supabase
      .from("restaurants")
      .insert(DEMO_RESTAURANTS.map((r) => ({ ...r, resort_id: resortId })))
      .select();

    if (restError) console.error("Error creating restaurants:", restError);

    if (restaurants?.length) {
      const slots: any[] = [];
      for (let day = 0; day <= 14; day++) {
        const slotDate = formatDate(addDays(today, day));
        restaurants.forEach((restaurant: any) => {
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "07:00", end_time: "10:00", meal_period: "BREAKFAST", capacity: restaurant.total_capacity, status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "12:00", end_time: "14:30", meal_period: "LUNCH", capacity: Math.floor(restaurant.total_capacity * 0.7), status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "19:00", end_time: "20:30", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
          slots.push({ resort_id: resortId, restaurant_id: restaurant.id, date: slotDate, start_time: "20:30", end_time: "22:00", meal_period: "DINNER", capacity: Math.floor(restaurant.total_capacity / 2), status: "OPEN" });
        });
      }
      const { data: createdSlots, error: slotError } = await supabase.from("restaurant_time_slots").insert(slots).select();
      if (slotError) console.error("Error creating restaurant slots:", slotError);
      else {
        console.log("Created", slots.length, "restaurant time slots");
        allSlots = createdSlots || [];
      }
    }
  }

  const guestData = DEMO_GUESTS.map((g) => ({
    resort_id: resortId,
    full_name: g.full_name,
    room_number: g.room_number,
    nationality: g.nationality,
    email: g.email,
    check_in_date: formatDate(addDays(today, g.daysFromNow)),
    check_out_date: formatDate(addDays(today, g.daysFromNow + g.stayLength)),
    portal_enabled: true,
  }));

  const { data: guests, error: guestError } = await supabase.from("guests").insert(guestData).select();
  
  if (guestError) console.error("Error creating guests:", guestError);
  else console.log("Created", guests?.length, "demo guests");

  const demoGuest = guests?.find((g: any) => g.room_number === "201") || guests?.[0];
  const pin = generatePin();
  
  if (demoGuest) {
    const pinHash = await hashPin(pin);
    await supabase.from("guests").update({
      portal_pin_hash: pinHash,
      portal_pin_last4: pin,
      portal_pin_set_at: new Date().toISOString(),
    }).eq("id", demoGuest.id);
  }

  // Create sample activity bookings
  if (guests?.length && allSessions?.length) {
    const bookingStatuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const activityBookings: any[] = [];
    
    const todayStr = formatDate(today);
    const futureSessions = allSessions.filter((s: any) => s.date >= todayStr);
    
    for (let i = 0; i < Math.min(8, futureSessions.length, guests.length * 2); i++) {
      const session = futureSessions[i % futureSessions.length];
      const guest = guests[i % guests.length];
      const status = bookingStatuses[i % bookingStatuses.length];
      const note = SAMPLE_BOOKING_NOTES[i % SAMPLE_BOOKING_NOTES.length];
      
      activityBookings.push({
        resort_id: resortId,
        session_id: session.id,
        guest_id: guest.id,
        room_number: guest.room_number,
        num_adults: Math.floor(Math.random() * 2) + 1,
        num_children: Math.floor(Math.random() * 2),
        status: status,
        source: "STAFF",
        notes: note,
        price_per_person: 50,
        total_amount: 50 * (Math.floor(Math.random() * 2) + 1),
      });
    }

    if (activityBookings.length) {
      const { error: bookingError } = await supabase.from("activity_bookings").insert(activityBookings);
      if (bookingError) console.error("Error creating activity bookings:", bookingError);
      else console.log("Created", activityBookings.length, "sample activity bookings");
    }
  }

  // Create sample restaurant reservations
  if (guests?.length && allSlots?.length) {
    const reservationStatuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "COMPLETED", "CANCELLED"];
    const specialRequests = ["Anniversary dinner - please arrange flowers", "Window table if possible", "High chair needed for infant", "Birthday celebration, cake requested", "Vegetarian menu required", null, null];
    const reservations: any[] = [];
    
    const todayStr = formatDate(today);
    const futureSlots = allSlots.filter((s: any) => s.date >= todayStr);
    
    for (let i = 0; i < Math.min(7, futureSlots.length, guests.length * 2); i++) {
      const slot = futureSlots[i % futureSlots.length];
      const guest = guests[i % guests.length];
      const status = reservationStatuses[i % reservationStatuses.length];
      const request = specialRequests[i % specialRequests.length];
      
      reservations.push({
        resort_id: resortId,
        restaurant_slot_id: slot.id,
        guest_id: guest.id,
        room_number: guest.room_number,
        num_adults: Math.floor(Math.random() * 3) + 1,
        num_children: Math.floor(Math.random() * 2),
        status: status,
        source: "STAFF",
        special_requests: request,
      });
    }

    if (reservations.length) {
      const { error: resError } = await supabase.from("restaurant_reservations").insert(reservations);
      if (resError) console.error("Error creating restaurant reservations:", resError);
      else console.log("Created", reservations.length, "sample restaurant reservations");
    }
  }

  if (demoGuest) {
    const nameParts = demoGuest.full_name.split(" ");
    const lastName = nameParts[nameParts.length - 1];

    return {
      guestId: demoGuest.id,
      guestName: demoGuest.full_name,
      roomNumber: demoGuest.room_number,
      lastName: lastName,
      pin: pin,
    };
  }

  return {
    guestId: "",
    guestName: "Demo Guest",
    roomNumber: "101",
    lastName: "Guest",
    pin: pin,
  };
}