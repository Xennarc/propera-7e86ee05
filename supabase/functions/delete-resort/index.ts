import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token for auth validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { resortId } = await req.json();
    if (!resortId) {
      return new Response(
        JSON.stringify({ error: "Missing resortId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to check if user is super admin
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is super admin
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.global_role !== "SUPER_ADMIN") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch resort details for audit log before deletion
    const { data: resort, error: resortFetchError } = await serviceClient
      .from("resorts")
      .select("name, code")
      .eq("id", resortId)
      .single();

    if (resortFetchError) {
      return new Response(
        JSON.stringify({ 
          error: "Resort not found", 
          details: resortFetchError.message,
          code: resortFetchError.code 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the deletion action BEFORE attempting delete
    await serviceClient.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "resort_deleted",
      resort_id: resortId,
      metadata_json: { 
        resort_name: resort.name, 
        resort_code: resort.code,
        deleted_via: "delete-resort-function"
      },
    });

    // Perform deletion using service role (bypasses RLS)
    const { error: deleteError } = await serviceClient
      .from("resorts")
      .delete()
      .eq("id", resortId);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete resort", 
          details: deleteError.message,
          code: deleteError.code,
          hint: deleteError.hint
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Resort ${resort.name} deleted successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: err instanceof Error ? err.message : String(err) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
