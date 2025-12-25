import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_ACTIVITIES = [
  { name: "House Reef Snorkel", category: "WATERSPORT", description: "Explore our vibrant house reef", short_description: "Guided snorkel tour", duration_minutes: 90, default_max_capacity: 8, default_price_per_person: 45, guest_can_book: true, guest_cutoff_hours: 2, difficulty_level: "EASY" },
  { name: "Intro Dive", category: "DIVE", description: "Perfect for beginners", short_description: "Beginner dive experience", duration_minutes: 180, default_max_capacity: 4, default_price_per_person: 150, guest_can_book: true, guest_cutoff_hours: 12, requires_approval: true, difficulty_level: "EASY" },
  { name: "Sunset Dolphin Cruise", category: "EXCURSION", description: "Watch dolphins at sunset", short_description: "Evening dolphin trip", duration_minutes: 120, default_max_capacity: 12, default_price_per_person: 85, guest_can_book: true, guest_cutoff_hours: 4, difficulty_level: "EASY" },
  { name: "Kayak Adventure", category: "WATERSPORT", description: "Explore the lagoon by kayak", short_description: "Self-guided kayak tour", duration_minutes: 60, default_max_capacity: 10, default_price_per_person: 35, guest_can_book: true, guest_cutoff_hours: 1, difficulty_level: "EASY" },
  { name: "Sunrise Yoga", category: "SPA", description: "Start your day with beachfront yoga", short_description: "Morning yoga session", duration_minutes: 60, default_max_capacity: 15, default_price_per_person: 25, guest_can_book: true, guest_cutoff_hours: 2, difficulty_level: "EASY" },
  { name: "Night Fishing", category: "EXCURSION", description: "Traditional Maldivian fishing experience", short_description: "Evening fishing trip", duration_minutes: 180, default_max_capacity: 8, default_price_per_person: 95, guest_can_book: true, guest_cutoff_hours: 6, difficulty_level: "EASY" },
];

const DEMO_RESTAURANTS = [
  { name: "Lagoon Restaurant", description: "Overwater dining with stunning views", total_capacity: 60, guest_can_book: true, guest_cutoff_minutes: 60, max_pax_per_booking: 8 },
  { name: "Sunset Grill", description: "Beachfront BBQ and seafood", total_capacity: 40, guest_can_book: true, guest_cutoff_minutes: 120, max_pax_per_booking: 6, requires_approval: true },
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

  try {
    const { email, resort_name, country, timezone, rooms_range, departments, role } = await req.json();

    if (!email || !resort_name) {
      return new Response(JSON.stringify({ success: false, error: "Email and resort name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        return new Response(JSON.stringify({
          success: true,
          existing: true,
          tenant_id: existingDemo.tenant_id,
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
          lead_score: 10, // Base score for creating a demo
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
        subscription_tier: "STARTER",
        onboarding_status: "NOT_STARTED",
      })
      .select()
      .single();

    if (resortError) throw resortError;

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

    // Generate admin credentials
    const tempPassword = generatePassword();
    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20) + ".demo";

    // Create the demo admin user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: "Demo Admin", must_reset_password: false },
    });

    if (authError) {
      // User might already exist - try to get them
      if (authError.message.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email.toLowerCase());
        
        if (existingUser) {
          // Add resort membership for existing user
          await supabaseAdmin.from("resort_memberships").insert({
            user_id: existingUser.id,
            resort_id: resort.id,
            resort_role: "RESORT_ADMIN",
          });

          // Seed demo data
          await seedDemoData(supabaseAdmin, resort.id, departments || []);

          // Log event
          await supabaseAdmin.from("lead_events").insert({
            lead_id: leadId,
            event_type: "demo_created",
            meta: { resort_id: resort.id, existing_user: true },
          });

          return new Response(JSON.stringify({
            success: true,
            tenant_id: resort.id,
            resort_code: resortCode,
            existing_user: true,
            message: "Demo created! Log in with your existing account.",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw authError;
    }

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      id: authUser.user.id,
      username,
      full_name: "Demo Admin",
      global_role: "STANDARD",
    });

    // Create resort membership
    await supabaseAdmin.from("resort_memberships").insert({
      user_id: authUser.user.id,
      resort_id: resort.id,
      resort_role: "RESORT_ADMIN",
    });

    // Seed demo data
    await seedDemoData(supabaseAdmin, resort.id, departments || []);

    // Log event
    await supabaseAdmin.from("lead_events").insert({
      lead_id: leadId,
      event_type: "demo_created",
      meta: { resort_id: resort.id, user_id: authUser.user.id },
    });

    // Send welcome email
    let emailSent = false;
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://propera.app";
        const signInLink = `${appUrl}/auth?email=${encodeURIComponent(email)}`;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Propera <noreply@propera.app>",
            to: [email],
            subject: `🎉 Your ${resort_name} demo is ready!`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #0f172a; margin-bottom: 24px;">Welcome to Propera!</h1>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                  Your demo resort <strong>${resort_name}</strong> is ready to explore.
                </p>
                <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Your login credentials:</p>
                  <p style="margin: 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 8px 0 0; font-size: 16px;"><strong>Password:</strong> ${tempPassword}</p>
                </div>
                <a href="${signInLink}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0;">
                  Sign In to Your Demo
                </a>
                <p style="color: #64748b; font-size: 14px; margin-top: 32px;">
                  Your demo expires in 14 days. Upgrade anytime to keep your data!
                </p>
              </div>
            `,
          }),
        });

        emailSent = emailRes.ok;
      }
    } catch (emailError) {
      console.error("Email send error:", emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      tenant_id: resort.id,
      resort_code: resortCode,
      email,
      temp_password: tempPassword,
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

async function seedDemoData(supabase: any, resortId: string, departments: string[]) {
  const today = new Date();

  // Create activities
  const activitiesToSeed = DEMO_ACTIVITIES.filter((a) => {
    if (departments.length === 0) return true;
    const deptMap: Record<string, string[]> = {
      activities: ["WATERSPORT", "EXCURSION"],
      dive_center: ["DIVE"],
      spa: ["SPA"],
    };
    return departments.some((d) => deptMap[d]?.includes(a.category));
  });

  const { data: activities } = await supabase
    .from("activities")
    .insert(activitiesToSeed.map((a) => ({ ...a, resort_id: resortId })))
    .select();

  // Create sessions for next 10 days
  if (activities?.length) {
    const sessions: any[] = [];
    for (let day = 0; day <= 10; day++) {
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
    await supabase.from("activity_sessions").insert(sessions);
  }

  // Create restaurants (if fnb department selected or no departments)
  if (departments.length === 0 || departments.includes("fnb")) {
    const { data: restaurants } = await supabase
      .from("restaurants")
      .insert(DEMO_RESTAURANTS.map((r) => ({ ...r, resort_id: resortId })))
      .select();

    if (restaurants?.length) {
      const slots: any[] = [];
      for (let day = 0; day <= 10; day++) {
        const slotDate = formatDate(addDays(today, day));
        restaurants.forEach((restaurant: any) => {
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
      await supabase.from("restaurant_time_slots").insert(slots);
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

  await supabase.from("guests").insert(guestData);
}
