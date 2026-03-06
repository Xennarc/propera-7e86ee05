import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://propera.cc",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurgeJob {
  id: string;
  resort_id: string;
  resort_code: string;
  resort_name: string;
  is_demo: boolean;
  requested_by: string;
  status: string;
  reason: string | null;
}

interface DeleteResult {
  table: string;
  count: number;
}

// Tables to delete in order (children before parents)
const TABLES_TO_DELETE = [
  // Deepest children - booking attendees and waitlist
  "booking_attendees",
  "activity_waitlist",
  
  // Guest-related events and messages
  "guest_profile_events",
  "guest_outbound_messages",
  "guest_sessions",
  "guest_requests",
  
  // Loyalty transactions
  "loyalty_transactions",
  "loyalty_redemptions",
  
  // Travel party
  "travel_party_members",
  "travel_party_room_links",
  
  // Prearrival
  "prearrival_staff_reviews",
  "prearrival_tokens",
  
  // Bookings
  "activity_bookings",
  "restaurant_reservations",
  
  // Mid-level entities
  "travel_parties",
  "loyalty_members",
  "prearrival_profiles",
  "stay_feedback",
  "support_sessions",
  "admin_notifications",
  "notifications",
  
  // Staff and access
  "staff_invitations",
  "user_resort_roles",
  "user_permission_overrides",
  
  // Vendor
  "vendor_booking_requests",
  "vendor_resorts",
  
  // Sessions and templates
  "activity_sessions",
  "activity_session_templates",
  "activity_recurring_rules",
  "activity_closures",
  "restaurant_time_slots",
  "restaurant_recurring_rules",
  "restaurant_closures",
  
  // Parent entities
  "activities",
  "restaurants",
  "resources",
  "vendors",
  
  // Guests (after all guest-related tables)
  "guests",
  
  // Loyalty config
  "loyalty_rewards",
  "loyalty_earn_rules",
  "loyalty_tiers",
  "loyalty_programs",
  
  // Resort config
  "prearrival_settings",
  "resort_settings",
  "resort_directory",
  "feature_flags",
  "roles",
  
  // Memberships
  "resort_memberships",
  
  // Audit logs (keep for compliance but scope by resort)
  "audit_logs",
  "access_audit_log",
  "staff_audit_logs",
  "platform_audit_log",
  "platform_errors",
  "platform_activity_events",
  "event_outbox",
  "booking_audit_logs",
  
  // Demo-related
  "demo_login_tokens",
  "demo_workspaces",
  "demo_tenants",
  "rollout_job_steps",
  
  // Incidents that reference this resort
  // Note: incidents.affected_resort_ids is an array, special handling needed
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Use service role client to bypass RLS and demo-write-blocking
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      throw new Error("job_id is required");
    }

    // Load the job
    const { data: job, error: jobError } = await supabase
      .from("resort_purge_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || "Unknown error"}`);
    }

    // Validate job status
    if (!["queued", "failed"].includes(job.status)) {
      throw new Error(`Job cannot be executed. Current status: ${job.status}`);
    }

    const resortId = job.resort_id;
    const startTime = Date.now();
    const deletionCounts: Record<string, number> = {};
    const storageCounts: Record<string, number> = {};

    // Update job to running
    await supabase
      .from("resort_purge_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        progress: 0,
        current_step: "Initializing purge...",
        error: null,
      })
      .eq("id", job_id);

    // Log purge started
    await supabase.from("admin_audit_logs").insert({
      actor_id: job.requested_by,
      action: "resort_purge_started",
      resort_id: resortId,
      metadata_json: {
        job_id: job_id,
        resort_name: job.resort_name,
        resort_code: job.resort_code,
        is_demo: job.is_demo,
      },
    });

    const totalSteps = TABLES_TO_DELETE.length + 3; // tables + 2 storage buckets + final delete
    let currentStep = 0;

    // Helper function to update progress
    const updateProgress = async (step: string, progress: number) => {
      await supabase
        .from("resort_purge_jobs")
        .update({
          current_step: step,
          progress: Math.min(progress, 99),
        })
        .eq("id", job_id);
    };

    // Delete from each table
    for (const table of TABLES_TO_DELETE) {
      currentStep++;
      const progress = Math.floor((currentStep / totalSteps) * 95);
      await updateProgress(`Deleting from ${table}...`, progress);

      try {
        // Check if table exists and has resort_id column
        const { count, error: deleteError } = await supabase
          .from(table)
          .delete({ count: "exact" })
          .eq("resort_id", resortId);

        if (deleteError) {
          // Table might not exist or have different structure - log but continue
          console.log(`Skipping ${table}: ${deleteError.message}`);
          deletionCounts[table] = 0;
        } else {
          deletionCounts[table] = count || 0;
          console.log(`Deleted ${count} rows from ${table}`);
        }
      } catch (tableError) {
        console.log(`Error deleting from ${table}:`, tableError);
        deletionCounts[table] = 0;
      }
    }

    // Clean up storage - activity-images bucket
    currentStep++;
    await updateProgress("Cleaning up activity images...", 96);
    try {
      const { data: activityImages } = await supabase.storage
        .from("activity-images")
        .list(resortId);

      if (activityImages && activityImages.length > 0) {
        const filePaths = activityImages.map((f) => `${resortId}/${f.name}`);
        await supabase.storage.from("activity-images").remove(filePaths);
        storageCounts["activity-images"] = activityImages.length;
      } else {
        storageCounts["activity-images"] = 0;
      }
    } catch (storageError) {
      console.log("Error cleaning activity-images:", storageError);
      storageCounts["activity-images"] = 0;
    }

    // Clean up storage - resort-branding bucket
    currentStep++;
    await updateProgress("Cleaning up resort branding...", 98);
    try {
      const { data: brandingFiles } = await supabase.storage
        .from("resort-branding")
        .list(resortId);

      if (brandingFiles && brandingFiles.length > 0) {
        const filePaths = brandingFiles.map((f) => `${resortId}/${f.name}`);
        await supabase.storage.from("resort-branding").remove(filePaths);
        storageCounts["resort-branding"] = brandingFiles.length;
      } else {
        storageCounts["resort-branding"] = 0;
      }
    } catch (storageError) {
      console.log("Error cleaning resort-branding:", storageError);
      storageCounts["resort-branding"] = 0;
    }

    // Final step - delete the resort itself
    await updateProgress("Deleting resort record...", 99);
    const { error: resortDeleteError } = await supabase
      .from("resorts")
      .delete()
      .eq("id", resortId);

    if (resortDeleteError) {
      throw new Error(`Failed to delete resort: ${resortDeleteError.message}`);
    }

    const durationMs = Date.now() - startTime;
    const totalRowsDeleted = Object.values(deletionCounts).reduce((a, b) => a + b, 0);
    const totalFilesDeleted = Object.values(storageCounts).reduce((a, b) => a + b, 0);

    const summary = {
      tables_deleted: deletionCounts,
      storage_files_deleted: storageCounts,
      total_rows_deleted: totalRowsDeleted,
      total_files_deleted: totalFilesDeleted,
      duration_ms: durationMs,
    };

    // Update job to completed
    await supabase
      .from("resort_purge_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        progress: 100,
        current_step: "Purge completed successfully",
        summary,
      })
      .eq("id", job_id);

    // Log purge completed
    await supabase.from("admin_audit_logs").insert({
      actor_id: job.requested_by,
      action: "resort_purge_completed",
      resort_id: resortId,
      metadata_json: {
        job_id: job_id,
        resort_name: job.resort_name,
        resort_code: job.resort_code,
        is_demo: job.is_demo,
        summary,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        summary,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Purge error:", errorMessage);

    // Try to update job status to failed
    try {
      const { job_id } = await req.clone().json();
      if (job_id) {
        const { data: job } = await supabase
          .from("resort_purge_jobs")
          .select("requested_by, resort_id, resort_name, resort_code, is_demo")
          .eq("id", job_id)
          .single();

        await supabase
          .from("resort_purge_jobs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error: errorMessage,
          })
          .eq("id", job_id);

        // Log purge failed
        if (job) {
          await supabase.from("admin_audit_logs").insert({
            actor_id: job.requested_by,
            action: "resort_purge_failed",
            resort_id: job.resort_id,
            metadata_json: {
              job_id: job_id,
              resort_name: job.resort_name,
              resort_code: job.resort_code,
              is_demo: job.is_demo,
              error: errorMessage,
            },
          });
        }
      }
    } catch (updateError) {
      console.error("Failed to update job status:", updateError);
    }

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

