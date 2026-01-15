import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify caller is super admin
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { user_id: user.id });
    if (!isSuperAdmin) {
      throw new Error('Super admin privileges required');
    }

    const { jobId, dryRun = false, rollback = false } = await req.json();

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Fetch job with steps
    const { data: job, error: jobError } = await supabase
      .from('rollout_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    const { data: steps } = await supabase
      .from('rollout_job_steps')
      .select('*')
      .eq('job_id', jobId);

    // Handle rollback
    if (rollback) {
      if (job.status !== 'completed') {
        throw new Error('Can only rollback completed jobs');
      }

      const rollbackResults = [];

      for (const step of steps || []) {
        if (step.status === 'completed' && Object.keys(step.old_value_json).length > 0) {
          // Revert to old values
          const { error } = await supabase
            .from('resort_settings')
            .update({
              ...step.old_value_json,
              updated_at: new Date().toISOString(),
              updated_by: user.id
            })
            .eq('resort_id', step.resort_id);

          rollbackResults.push({
            resortId: step.resort_id,
            success: !error,
            error: error?.message
          });

          // Audit log
          await supabase.from('admin_audit_logs').insert({
            actor_id: user.id,
            action: 'rollout_rollback',
            resort_id: step.resort_id,
            metadata_json: {
              job_id: jobId,
              reverted_from: step.new_value_json,
              reverted_to: step.old_value_json
            }
          });
        }
      }

      // Update job status
      await supabase
        .from('rollout_jobs')
        .update({ status: 'rolled_back', finished_at: new Date().toISOString() })
        .eq('id', jobId);

      return new Response(JSON.stringify({ success: true, rollbackResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Execute rollout (dry run or actual)
    const results = [];

    // Update job to in_progress if not dry run
    if (!dryRun) {
      await supabase
        .from('rollout_jobs')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', jobId);
    }

    for (const resortId of job.target_resort_ids) {
      const stepResult = await executeStepForResort(
        supabase,
        job.change_type,
        resortId,
        job.payload_json,
        dryRun,
        user.id
      );
      
      results.push(stepResult);

      if (!dryRun) {
        // Update step status
        await supabase
          .from('rollout_job_steps')
          .update({
            status: stepResult.success ? 'completed' : 'failed',
            old_value_json: stepResult.oldValue || {},
            new_value_json: stepResult.newValue || {},
            finished_at: new Date().toISOString(),
            error_message: stepResult.error
          })
          .eq('job_id', jobId)
          .eq('resort_id', resortId);

        // Audit log per resort
        await supabase.from('admin_audit_logs').insert({
          actor_id: user.id,
          action: `rollout_${job.change_type}`,
          resort_id: resortId,
          metadata_json: {
            job_id: jobId,
            old_value: stepResult.oldValue,
            new_value: stepResult.newValue,
            success: stepResult.success
          }
        });

        // Platform activity event
        await supabase.from('platform_activity_events').insert({
          event_type: 'rollout_applied',
          target_type: 'resort',
          target_id: resortId,
          actor_user_id: user.id,
          metadata: {
            job_id: jobId,
            change_type: job.change_type,
            change_label: job.change_label
          }
        });
      }
    }

    // Update job final status
    if (!dryRun) {
      const allSuccess = results.every(r => r.success);
      await supabase
        .from('rollout_jobs')
        .update({
          status: allSuccess ? 'completed' : 'failed',
          finished_at: new Date().toISOString(),
          error_message: allSuccess ? null : 'Some steps failed'
        })
        .eq('id', jobId);
    } else {
      await supabase
        .from('rollout_jobs')
        .update({
          status: 'dry_run',
          dry_run_result_json: results
        })
        .eq('id', jobId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      dryRun,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Execute rollout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function executeStepForResort(
  supabase: any,
  changeType: string,
  resortId: string,
  payload: any,
  dryRun: boolean,
  userId: string
) {
  try {
    switch (changeType) {
      case 'enable_prearrival': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('prearrival_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { prearrival_enabled: current?.prearrival_enabled ?? false };
        const newValue = { prearrival_enabled: true };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            prearrival_enabled: true, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'disable_prearrival': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('prearrival_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { prearrival_enabled: current?.prearrival_enabled ?? true };
        const newValue = { prearrival_enabled: false };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            prearrival_enabled: false, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'enable_guest_booking': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('guest_booking_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { guest_booking_enabled: current?.guest_booking_enabled ?? true };
        const newValue = { guest_booking_enabled: true };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            guest_booking_enabled: true, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'disable_guest_booking': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('guest_booking_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { guest_booking_enabled: current?.guest_booking_enabled ?? true };
        const newValue = { guest_booking_enabled: false };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            guest_booking_enabled: false, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'enable_loyalty': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('loyalty_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { loyalty_enabled: current?.loyalty_enabled ?? false };
        const newValue = { loyalty_enabled: true };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            loyalty_enabled: true, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'disable_loyalty': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('loyalty_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { loyalty_enabled: current?.loyalty_enabled ?? true };
        const newValue = { loyalty_enabled: false };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            loyalty_enabled: false, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'refresh_branding': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('branding_version')
          .eq('resort_id', resortId)
          .single();

        const oldVersion = current?.branding_version ?? 1;
        const newVersion = oldVersion + 1;

        const oldValue = { branding_version: oldVersion };
        const newValue = { branding_version: newVersion };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            branding_version: newVersion, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'regenerate_seo': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('seo_version')
          .eq('resort_id', resortId)
          .single();

        const oldVersion = current?.seo_version ?? 1;
        const newVersion = oldVersion + 1;

        const oldValue = { seo_version: oldVersion };
        const newValue = { seo_version: newVersion };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            seo_version: newVersion, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'enable_activities': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('activities_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { activities_enabled: current?.activities_enabled ?? true };
        const newValue = { activities_enabled: true };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            activities_enabled: true, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'disable_activities': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('activities_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { activities_enabled: current?.activities_enabled ?? true };
        const newValue = { activities_enabled: false };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            activities_enabled: false, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'enable_dining': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('dining_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { dining_enabled: current?.dining_enabled ?? true };
        const newValue = { dining_enabled: true };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            dining_enabled: true, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      case 'disable_dining': {
        const { data: current } = await supabase
          .from('resort_settings')
          .select('dining_enabled')
          .eq('resort_id', resortId)
          .single();

        const oldValue = { dining_enabled: current?.dining_enabled ?? true };
        const newValue = { dining_enabled: false };

        if (dryRun) {
          return { success: true, resortId, oldValue, newValue };
        }

        const { error } = await supabase
          .from('resort_settings')
          .update({ 
            dining_enabled: false, 
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('resort_id', resortId);

        return { success: !error, resortId, oldValue, newValue, error: error?.message };
      }

      default:
        return {
          success: false,
          resortId,
          oldValue: {},
          newValue: {},
          error: `Unknown change type: ${changeType}`
        };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      resortId,
      oldValue: {},
      newValue: {},
      error: errorMessage
    };
  }
}
