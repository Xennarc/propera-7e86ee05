import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RetentionResult {
  success: boolean;
  total_archived?: number;
  total_purged?: number;
  details?: unknown[];
  ran_at?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use service role to bypass RLS for system operations
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "both";

    const results: {
      archive?: RetentionResult;
      purge?: RetentionResult;
    } = {};

    // Run archive job (daily recommended)
    if (action === "archive" || action === "both") {
      console.log("Starting archive_closed_requests...");
      const { data: archiveResult, error: archiveError } = await supabase.rpc(
        "archive_closed_requests"
      );

      if (archiveError) {
        console.error("Archive error:", archiveError);
        results.archive = { success: false, error: archiveError.message };
      } else {
        console.log("Archive result:", archiveResult);
        results.archive = archiveResult as RetentionResult;
      }
    }

    // Run purge job (weekly recommended, but can run daily)
    if (action === "purge" || action === "both") {
      console.log("Starting purge_archived_requests...");
      const { data: purgeResult, error: purgeError } = await supabase.rpc(
        "purge_archived_requests"
      );

      if (purgeError) {
        console.error("Purge error:", purgeError);
        results.purge = { success: false, error: purgeError.message };
      } else {
        console.log("Purge result:", purgeResult);
        results.purge = purgeResult as RetentionResult;
      }
    }

    // Log to admin_audit_logs for visibility
    const totalArchived = results.archive?.total_archived || 0;
    const totalPurged = results.purge?.total_purged || 0;

    if (totalArchived > 0 || totalPurged > 0) {
      await supabase.from("admin_audit_logs").insert({
        actor_id: "00000000-0000-0000-0000-000000000000", // System actor
        action: "retention_job_completed",
        metadata_json: {
          action,
          archived: totalArchived,
          purged: totalPurged,
          ran_at: new Date().toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        results,
        ran_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Retention scheduler error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
