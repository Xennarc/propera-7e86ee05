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

    // Create a client with the user's token to verify their identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

    // Create admin client for privileged operations
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

    // Parse request body
    const { username, password, full_name, email, resort_id, resort_role, department, set_super_admin } = await req.json();

    // Check if user is SUPER_ADMIN
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching caller profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const isSuperAdmin = callerProfile?.global_role === 'SUPER_ADMIN';

    // CRITICAL: Only SUPER_ADMIN can create SUPER_ADMIN accounts
    if (set_super_admin && !isSuperAdmin) {
      console.error('Non-SUPER_ADMIN attempted to create SUPER_ADMIN account');
      return new Response(
        JSON.stringify({ success: false, error: 'Only Super Admins can create Super Admin accounts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // If not SUPER_ADMIN, check if they are RESORT_ADMIN for the target resort
    if (!isSuperAdmin) {
      if (!resort_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Resort ID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('resort_memberships')
        .select('resort_role')
        .eq('user_id', user.id)
        .eq('resort_id', resort_id)
        .single();

      if (membershipError || !membership) {
        console.error('User has no membership for resort:', resort_id);
        return new Response(
          JSON.stringify({ success: false, error: 'You do not have permission to create staff for this resort' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      if (membership.resort_role !== 'RESORT_ADMIN') {
        console.error('User is not RESORT_ADMIN for resort:', resort_id);
        return new Response(
          JSON.stringify({ success: false, error: 'Only Resort Admins can create staff accounts' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    console.log('Authorization passed. isSuperAdmin:', isSuperAdmin);

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

    if (!set_super_admin && !resort_role) {
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

    // Determine global role
    const newGlobalRole = set_super_admin ? 'SUPER_ADMIN' : 'STANDARD';

    // Update profile with username and global role
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username.trim(),
        full_name: full_name || '',
        global_role: newGlobalRole
      })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('Profile error:', profileUpdateError);
      // Try to clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create resort membership if provided (not for SUPER_ADMIN only accounts)
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

    // Log the action for audit
    await supabaseAdmin
      .from('staff_audit_logs')
      .insert({
        actor_id: user.id,
        action: set_super_admin ? 'super_admin_account_created' : 'staff_account_created',
        resort_id: resort_id || null,
        target_user_id: authData.user.id,
        metadata_json: {
          username: username.trim(),
          resort_role: resort_role || null,
          global_role: newGlobalRole,
          department: department || null
        }
      });

    console.log('Staff account created successfully:', authData.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        email: userEmail,
        username: username.trim(),
        membership_id: membershipId,
        global_role: newGlobalRole
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
