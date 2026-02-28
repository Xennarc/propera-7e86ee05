import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Verify SUPER_ADMIN role via profiles table
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("global_role")
      .eq("id", callerId)
      .single();

    if (profile?.global_role !== "SUPER_ADMIN") {
      return new Response(
        JSON.stringify({ error: "Forbidden: SUPER_ADMIN role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse optional user_id from body
    let targetUserId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetUserId = body.user_id || null;
      } catch {
        // No body or invalid JSON — proceed with platform-wide logout
      }
    }

    let loggedOutCount = 0;

    if (targetUserId) {
      // Single user logout
      if (targetUserId === callerId) {
        return new Response(
          JSON.stringify({ error: "Cannot log out your own session" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { error } = await adminClient.auth.admin.signOut(
        targetUserId,
        "global"
      );
      if (!error) loggedOutCount = 1;
    } else {
      // Platform-wide logout — iterate all users, skip caller
      let page = 1;
      const perPage = 100;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error || !data?.users?.length) {
          hasMore = false;
          break;
        }

        for (const user of data.users) {
          if (user.id === callerId) continue;
          const { error: signOutErr } = await adminClient.auth.admin.signOut(
            user.id,
            "global"
          );
          if (!signOutErr) loggedOutCount++;
        }

        hasMore = data.users.length === perPage;
        page++;
      }
    }

    // Audit log
    await adminClient.from("admin_audit_logs").insert({
      actor_id: callerId,
      action: targetUserId
        ? "force_logout_user"
        : "force_logout_all_devices",
      metadata_json: {
        target_user_id: targetUserId,
        logged_out_count: loggedOutCount,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        logged_out_count: loggedOutCount,
        scope: targetUserId ? "single_user" : "platform_wide",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("admin-logout-all-devices error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
