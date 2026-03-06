import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://propera.cc',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - missing token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create a client with the user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request body
    const { new_password } = await req.json();

    // Validate password
    if (!new_password || new_password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check that user actually needs to reset password
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('must_reset_password, temp_password_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify password reset status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!profile?.must_reset_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password reset not required for this account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if temp password has expired
    if (profile.temp_password_expires_at && new Date(profile.temp_password_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Your temporary password has expired. Please contact your administrator for a new one.',
          expired: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Update password in auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Clear the password reset flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        must_reset_password: false,
        temp_password_expires_at: null,
        password_reset_completed_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.error('Profile update error:', profileUpdateError);
      // Password was updated, just flag clearing failed - continue anyway
    }

    // Log the action
    await supabaseAdmin
      .from('staff_audit_logs')
      .insert({
        actor_id: user.id,
        action: 'RESORT_ADMIN_PASSWORD_RESET_COMPLETED',
        target_user_id: user.id,
        metadata_json: {}
      });

    console.log('Password reset completed for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
