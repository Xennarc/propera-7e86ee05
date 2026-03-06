import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://propera.cc',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Parse optional threshold from request body
    let thresholdDays = 14;
    try {
      const body = await req.json();
      if (body?.threshold_days && typeof body.threshold_days === 'number') {
        thresholdDays = body.threshold_days;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`[generate-subscription-alerts] Running with threshold: ${thresholdDays} days`);

    // Call the database function to generate alerts
    const { data, error } = await supabase.rpc('generate_subscription_alerts', {
      threshold_days_param: thresholdDays,
    });

    if (error) {
      console.error('[generate-subscription-alerts] RPC error:', error);
      throw error;
    }

    console.log('[generate-subscription-alerts] Result:', data);

    // Log to admin_audit_logs
    await supabase.from('admin_audit_logs').insert({
      actor_id: '00000000-0000-0000-0000-000000000000', // System actor
      action: 'generate_subscription_alerts',
      metadata_json: data,
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[generate-subscription-alerts] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
