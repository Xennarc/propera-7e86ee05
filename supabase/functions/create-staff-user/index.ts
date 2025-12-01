import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { username, password, full_name, email, resort_id, resort_role, department } = await req.json();

    // Validate inputs
    if (!username || username.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username must be at least 3 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username can only contain letters, numbers, and underscores' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!resort_role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resort role is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', username.trim())
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username is already taken' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Generate email if not provided
    const userEmail = email?.trim() || `${username.trim().toLowerCase()}@staff.propera.internal`;

    // Check if email already exists (if it's a real email)
    if (email?.trim() && !email.includes('@staff.propera.internal')) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === userEmail.toLowerCase());
      
      if (emailExists) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email is already registered' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Create user with Supabase Auth Admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update profile with username
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username.trim(),
        full_name: full_name || '',
        global_role: 'STANDARD'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile error:', profileError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create resort membership if provided
    let membershipId = null;
    if (resort_id && resort_role) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('resort_memberships')
        .insert({
          user_id: authData.user.id,
          resort_id: resort_id,
          resort_role: resort_role,
          department: department || null
        })
        .select('id')
        .single();

      if (membershipError) {
        console.error('Membership error:', membershipError);
        // Clean up
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create resort membership' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      membershipId = membership?.id;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        email: userEmail,
        username: username.trim(),
        membership_id: membershipId
      }),
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
