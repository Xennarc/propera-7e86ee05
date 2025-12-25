import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = "https://propera.cc";

const DEMO_ACTIVITIES = [
  { name: "House Reef Snorkel", category: "WATERSPORT", description: "Explore our vibrant house reef", short_description: "Guided snorkel tour", duration_minutes: 90, default_max_capacity: 8, default_price_per_person: 45, guest_can_book: true, guest_cutoff_hours: 2, difficulty_level: "EASY" },
  { name: "Intro Dive", category: "DIVE", description: "Perfect for beginners", short_description: "Beginner dive experience", duration_minutes: 180, default_max_capacity: 4, default_price_per_person: 150, guest_can_book: true, guest_cutoff_hours: 12, requires_approval: true, difficulty_level: "EASY" },
  { name: "Sunset Dolphin Cruise", category: "EXCURSION", description: "Watch dolphins at sunset", short_description: "Evening dolphin trip", duration_minutes: 120, default_max_capacity: 12, default_price_per_person: 85, guest_can_book: true, guest_cutoff_hours: 4, difficulty_level: "EASY" },
  { name: "Kayak Adventure", category: "WATERSPORT", description: "Explore the lagoon by kayak", short_description: "Self-guided kayak tour", duration_minutes: 60, default_max_capacity: 10, default_price_per_person: 35, guest_can_book: true, guest_cutoff_hours: 1, difficulty_level: "EASY" },
  { name: "Sunrise Yoga", category: "SPA", description: "Start your day with beachfront yoga", short_description: "Morning yoga session", duration_minutes: 60, default_max_capacity: 15, default_price_per_person: 25, guest_can_book: true, guest_cutoff_hours: 2, difficulty_level: "EASY" },
  { name: "Night Fishing", category: "EXCURSION", description: "Traditional Maldivian fishing experience", short_description: "Evening fishing trip", duration_minutes: 180, default_max_capacity: 8, default_price_per_person: 95, guest_can_book: true, guest_cutoff_hours: 6, difficulty_level: "EASY" },
  { name: "Deep Tissue Massage", category: "SPA", description: "Relaxing full body massage", short_description: "60-min massage", duration_minutes: 60, default_max_capacity: 2, default_price_per_person: 120, guest_can_book: true, guest_cutoff_hours: 4, difficulty_level: "EASY" },
  { name: "Advanced Reef Dive", category: "DIVE", description: "For certified divers", short_description: "2-tank dive trip", duration_minutes: 240, default_max_capacity: 6, default_price_per_person: 200, guest_can_book: true, guest_cutoff_hours: 12, requires_approval: true, difficulty_level: "INTERMEDIATE" },
];

const DEMO_RESTAURANTS = [
  { name: "Lagoon Restaurant", description: "Overwater dining with stunning views", total_capacity: 60, guest_can_book: true, guest_cutoff_minutes: 60, max_pax_per_booking: 8 },
  { name: "Sunset Grill", description: "Beachfront BBQ and seafood", total_capacity: 40, guest_can_book: true, guest_cutoff_minutes: 120, max_pax_per_booking: 6, requires_approval: true },
  { name: "The Teppanyaki", description: "Japanese cuisine with live cooking", total_capacity: 24, guest_can_book: true, guest_cutoff_minutes: 180, max_pax_per_booking: 6 },
];

const DEMO_GUESTS = [
  { full_name: "James Wilson", room_number: "101", nationality: "United Kingdom", daysFromNow: -2, stayLength: 7, email: "james.wilson@example.com" },
  { full_name: "Sarah Chen", room_number: "102", nationality: "Singapore", daysFromNow: -1, stayLength: 5, email: "sarah.chen@example.com" },
  { full_name: "Emma Miller", room_number: "201", nationality: "Australia", daysFromNow: 0, stayLength: 10, email: "emma.miller@example.com" },
  { full_name: "Hans Mueller", room_number: "202", nationality: "Germany", daysFromNow: -3, stayLength: 8, email: "hans.mueller@example.com" },
  { full_name: "Yuki Tanaka", room_number: "301", nationality: "Japan", daysFromNow: 0, stayLength: 4, email: "yuki.tanaka@example.com" },
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

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getBaseUrl(req: Request): string {
  // Use origin header if available, fallback to production URL
  const origin = req.headers.get("origin");
  if (origin && (origin.includes("localhost") || origin.includes("lovableproject.com"))) {
    return origin;
  }
  return PRODUCTION_URL;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resort_name, country, timezone, rooms_range, departments, role } = await req.json();

    if (!email || !resort_name) {
      return new Response(JSON.stringify({ success: false, error: "Email and resort name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Starting demo provision for:", email, resort_name, "departments:", departments);

    const baseUrl = getBaseUrl(req);
    console.log("Using base URL:", baseUrl);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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

    // Check for existing lead
    let leadId: string;
    const { data: existingLead } = await supabaseAdmin
      .from("leads")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .single();

    if (existingLead) {
      leadId = existingLead.id;
      // Check if they already have an active demo
      const { data: existingDemo } = await supabaseAdmin
        .from("demo_tenants")
        .select("id, tenant_id, expires_at")
        .eq("lead_id", leadId)
        .eq("is_converted", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingDemo) {
        // Get the existing resort code
        const { data: existingResort } = await supabaseAdmin
          .from("resorts")
          .select("code")
          .eq("id", existingDemo.tenant_id)
          .single();

        const resortCode = existingResort?.code || "";
        
        return new Response(JSON.stringify({
          success: true,
          existing: true,
          tenant_id: existingDemo.tenant_id,
          resort_code: resortCode,
          staff_login_url: `${baseUrl}/staff/auth?username=${encodeURIComponent(email)}`,
          message: "You already have an active demo",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update lead with new info
      await supabaseAdmin
        .from("leads")
        .update({ resort_name, country, timezone, rooms_range, departments, role, status: "sandbox_created", updated_at: new Date().toISOString() })
        .eq("id", leadId);
    } else {
      // Create new lead
      const { data: newLead, error: leadError } = await supabaseAdmin
        .from("leads")
        .insert({
          email: email.toLowerCase(),
          resort_name,
          country,
          timezone,
          rooms_range,
          departments,
          role,
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
    const { error: demoTenantError } = await supabaseAdmin
      .from("demo_tenants")
      .insert({
        lead_id: leadId,
        tenant_id: resort.id,
        expires_at: expiresAt.toISOString(),
      });

    if (demoTenantError) throw demoTenantError;

    // Generate admin credentials with plus-addressing for uniqueness
    const tempPassword = generatePassword();
    const emailParts = email.split("@");
    const demoEmail = `${emailParts[0]}+${resortCode.toLowerCase()}@${emailParts[1]}`;
    const username = emailParts[0].toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20) + ".demo";

    // Create the demo admin user with plus-addressed email
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
      // If plus-addressed email fails, try with original email
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
            
            // Add resort membership for existing user
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

        // Create profile
        await supabaseAdmin.from("profiles").upsert({
          id: userId,
          username,
          full_name: "Demo Admin",
          global_role: "STANDARD",
        });

        // Create resort membership
        await supabaseAdmin.from("resort_memberships").insert({
          user_id: userId,
          resort_id: resort.id,
          resort_role: "RESORT_ADMIN",
        });
      }
    } else {
      userId = authUser.user.id;
      staffIdentifier = demoEmail;

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        username,
        full_name: "Demo Admin",
        global_role: "STANDARD",
      });

      // Create resort membership
      await supabaseAdmin.from("resort_memberships").insert({
        user_id: userId,
        resort_id: resort.id,
        resort_role: "RESORT_ADMIN",
      });
    }

    console.log("Admin user setup complete:", userId, "identifier:", staffIdentifier);

    // Seed demo data and get a guest with PIN for demo
    const demoGuestInfo = await seedDemoData(supabaseAdmin, resort.id, departments || [], resortCode);
    console.log("Demo data seeded, guest info:", demoGuestInfo);

    // Build URLs
    const staffLoginUrl = `${baseUrl}/staff/auth?username=${encodeURIComponent(staffIdentifier)}`;
    const guestLoginUrl = `${baseUrl}/resort/${resortCode}/guest/login?roomNumber=${encodeURIComponent(demoGuestInfo.roomNumber)}&lastName=${encodeURIComponent(demoGuestInfo.lastName)}`;

    // Log event
    await supabaseAdmin.from("lead_events").insert({
      lead_id: leadId,
      event_type: "demo_created",
      meta: { resort_id: resort.id, user_id: userId },
    });

    // Send welcome email with both staff and guest logins
    let emailSent = false;
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Propera <noreply@propera.cc>",
            to: [email], // Send to original email, not plus-addressed
            subject: `🎉 Your ${resort_name} demo is ready!`,
            html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #0f172a; margin: 0 0 8px; font-size: 28px;">Welcome to Propera!</h1>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Your demo resort <strong>${resort_name}</strong> is ready to explore.</p>
              </div>

              <!-- Staff Login Section -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 18px; display: flex; align-items: center;">
                  👤 Staff Console Login
                </h2>
                <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">
                  Manage activities, sessions, guests, and view bookings.
                </p>
                <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong> ${staffIdentifier}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Password:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                </div>
                <a href="${staffLoginUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Open Staff Console →
                </a>
              </div>

              <!-- Guest Login Section -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
                <h2 style="color: #065f46; margin: 0 0 16px; font-size: 18px;">
                  🏝️ Guest Portal Login
                </h2>
                <p style="color: #047857; margin: 0 0 16px; font-size: 14px;">
                  Experience booking from the guest's perspective.
                </p>
                <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #a7f3d0;">
                  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Guest:</strong> ${demoGuestInfo.guestName}</p>
                  <p style="margin: 0 0 8px; font-size: 14px;"><strong>Room:</strong> ${demoGuestInfo.roomNumber}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>PIN:</strong> <code style="background: #ecfdf5; padding: 2px 6px; border-radius: 4px; font-size: 16px; letter-spacing: 2px;">${demoGuestInfo.pin}</code></p>
                </div>
                <a href="${guestLoginUrl}" style="display: inline-block; background: #059669; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Open Guest Portal →
                </a>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;">
                  Your demo expires in <strong>14 days</strong>. Upgrade anytime to keep your data!
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  Questions? Reply to this email or visit <a href="${PRODUCTION_URL}" style="color: #2563eb;">propera.cc</a>
                </p>
              </div>
            </div>
          `,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log("Welcome email sent successfully");
        } else {
          const errorData = await emailRes.text();
          console.error("Resend email error:", errorData);
        }
      } else {
        console.log("RESEND_API_KEY not configured, skipping email");
      }
    } catch (emailError) {
      console.error("Email send error:", emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      tenant_id: resort.id,
      resort_code: resortCode,
      email: staffIdentifier,
      temp_password: tempPassword,
      guest_login: {
        guest_name: demoGuestInfo.guestName,
        room_number: demoGuestInfo.roomNumber,
        last_name: demoGuestInfo.lastName,
        pin: demoGuestInfo.pin,
        portal_url: guestLoginUrl,
      },
      staff_login_url: staffLoginUrl,
      email_sent: emailSent,
      expires_at: expiresAt.toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Provision demo error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function seedDemoData(supabase: any, resortId: string, departments: string[], resortCode: string): Promise<{ guestName: string; roomNumber: string; lastName: string; pin: string }> {
  const today = new Date();

  // Department mapping: frontend values -> activity categories
  // Frontend: dive, watersports, spa, excursions, dining
  const deptMap: Record<string, string[]> = {
    dive: ["DIVE"],
    watersports: ["WATERSPORT"],
    spa: ["SPA"],
    excursions: ["EXCURSION"],
  };

  // Filter activities based on selected departments
  // If no departments or empty, seed all activities
  const activitiesToSeed = departments.length === 0 
    ? DEMO_ACTIVITIES 
    : DEMO_ACTIVITIES.filter((a) => {
        return departments.some((dept) => deptMap[dept]?.includes(a.category));
      });

  // Always seed at least some activities if the filter results in empty
  const finalActivities = activitiesToSeed.length > 0 ? activitiesToSeed : DEMO_ACTIVITIES.slice(0, 3);

  console.log("Seeding activities:", finalActivities.map(a => a.name));

  const { data: activities, error: actError } = await supabase
    .from("activities")
    .insert(finalActivities.map((a) => ({ ...a, resort_id: resortId })))
    .select();

  if (actError) {
    console.error("Error creating activities:", actError);
  }

  // Create sessions for next 10 days
  if (activities?.length) {
    const sessions: any[] = [];
    for (let day = 0; day <= 10; day++) {
      const sessionDate = formatDate(addDays(today, day));
      activities.forEach((activity: any) => {
        // Morning session
        sessions.push({
          resort_id: resortId,
          activity_id: activity.id,
          date: sessionDate,
          start_time: "09:00",
          end_time: "10:30",
          capacity: activity.default_max_capacity,
          status: "SCHEDULED",
        });
        // Afternoon session on even days
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
    const { error: sessError } = await supabase.from("activity_sessions").insert(sessions);
    if (sessError) {
      console.error("Error creating sessions:", sessError);
    } else {
      console.log("Created", sessions.length, "activity sessions");
    }
  }

  // Create restaurants if dining department selected or no departments specified
  const shouldSeedDining = departments.length === 0 || departments.includes("dining");
  
  if (shouldSeedDining) {
    console.log("Seeding restaurants and time slots");
    const { data: restaurants, error: restError } = await supabase
      .from("restaurants")
      .insert(DEMO_RESTAURANTS.map((r) => ({ ...r, resort_id: resortId })))
      .select();

    if (restError) {
      console.error("Error creating restaurants:", restError);
    }

    if (restaurants?.length) {
      const slots: any[] = [];
      for (let day = 0; day <= 10; day++) {
        const slotDate = formatDate(addDays(today, day));
        restaurants.forEach((restaurant: any) => {
          // Breakfast
          slots.push({
            resort_id: resortId,
            restaurant_id: restaurant.id,
            date: slotDate,
            start_time: "07:00",
            end_time: "10:00",
            meal_period: "BREAKFAST",
            capacity: restaurant.total_capacity,
            status: "OPEN",
          });
          // Lunch
          slots.push({
            resort_id: resortId,
            restaurant_id: restaurant.id,
            date: slotDate,
            start_time: "12:00",
            end_time: "14:30",
            meal_period: "LUNCH",
            capacity: Math.floor(restaurant.total_capacity * 0.7),
            status: "OPEN",
          });
          // Dinner early seating
          slots.push({
            resort_id: resortId,
            restaurant_id: restaurant.id,
            date: slotDate,
            start_time: "19:00",
            end_time: "20:30",
            meal_period: "DINNER",
            capacity: Math.floor(restaurant.total_capacity / 2),
            status: "OPEN",
          });
          // Dinner late seating
          slots.push({
            resort_id: resortId,
            restaurant_id: restaurant.id,
            date: slotDate,
            start_time: "20:30",
            end_time: "22:00",
            meal_period: "DINNER",
            capacity: Math.floor(restaurant.total_capacity / 2),
            status: "OPEN",
          });
        });
      }
      const { error: slotError } = await supabase.from("restaurant_time_slots").insert(slots);
      if (slotError) {
        console.error("Error creating restaurant slots:", slotError);
      } else {
        console.log("Created", slots.length, "restaurant time slots");
      }
    }
  }

  // Create demo guests
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
  
  if (guestError) {
    console.error("Error creating guests:", guestError);
  } else {
    console.log("Created", guests?.length, "demo guests");
  }

  // Generate PIN for the first guest (Emma Miller - current check-in)
  const demoGuest = guests?.find((g: any) => g.room_number === "201") || guests?.[0];
  const pin = generatePin();
  
  if (demoGuest) {
    // Hash the PIN and update the guest
    const pinHash = await hashPin(pin);
    await supabase.from("guests").update({
      portal_pin_hash: pinHash,
      portal_pin_last4: pin,
      portal_pin_set_at: new Date().toISOString(),
    }).eq("id", demoGuest.id);

    // Extract last name from full name
    const nameParts = demoGuest.full_name.split(" ");
    const lastName = nameParts[nameParts.length - 1];

    return {
      guestName: demoGuest.full_name,
      roomNumber: demoGuest.room_number,
      lastName: lastName,
      pin: pin,
    };
  }

  return {
    guestName: "Demo Guest",
    roomNumber: "101",
    lastName: "Guest",
    pin: pin,
  };
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
