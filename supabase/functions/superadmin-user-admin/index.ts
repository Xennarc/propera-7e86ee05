import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Mode = 'deactivate' | 'restore' | 'delete_permanent';

interface RequestBody {
  mode: Mode;
  user_id: string;
  reason?: string;
  remove_memberships?: boolean;
}

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
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
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

    // Verify caller is SUPER_ADMIN
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

    if (callerProfile?.global_role !== 'SUPER_ADMIN') {
      console.error('Non-SUPER_ADMIN attempted user admin action');
      return new Response(
        JSON.stringify({ success: false, error: 'Only Super Admins can perform this action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Parse request body
    const { mode, user_id, reason, remove_memberships } = await req.json() as RequestBody;

    // Validate inputs
    if (!mode || !['deactivate', 'restore', 'delete_permanent'].includes(mode)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid mode. Must be: deactivate, restore, or delete_permanent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Prevent self-action
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'You cannot perform this action on your own account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch target user profile
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, username, global_role, is_disabled, deleted_at')
      .eq('id', user_id)
      .single();

    if (targetError || !targetProfile) {
      console.error('Target user not found:', targetError);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`Mode: ${mode}, Target: ${user_id}, Caller: ${user.id}`);

    // Execute based on mode
    switch (mode) {
      case 'deactivate': {
        if (targetProfile.is_disabled) {
          return new Response(
            JSON.stringify({ success: false, error: 'User is already disabled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Update profile to disabled
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_disabled: true,
            disabled_at: new Date().toISOString(),
            disabled_by: user.id,
            deletion_reason: reason || null,
          })
          .eq('id', user_id);

        if (updateError) {
          console.error('Error disabling user:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to disable user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Optionally remove memberships
        let membershipsRemoved = 0;
        if (remove_memberships) {
          const { data: deleted, error: membershipError } = await supabaseAdmin
            .from('resort_memberships')
            .delete()
            .eq('user_id', user_id)
            .select('id');

          if (membershipError) {
            console.error('Error removing memberships:', membershipError);
            // Non-fatal, continue
          } else {
            membershipsRemoved = deleted?.length || 0;
          }
        }

        // Audit log
        await supabaseAdmin
          .from('staff_audit_logs')
          .insert({
            actor_id: user.id,
            action: 'user_deactivated',
            target_user_id: user_id,
            metadata_json: {
              reason: reason || null,
              target_global_role: targetProfile.global_role,
              memberships_removed: membershipsRemoved,
            }
          });

        console.log(`User ${user_id} deactivated by ${user.id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User deactivated successfully',
            memberships_removed: membershipsRemoved
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'restore': {
        if (!targetProfile.is_disabled && !targetProfile.deleted_at) {
          return new Response(
            JSON.stringify({ success: false, error: 'User is not disabled or deleted' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Permanently deleted users cannot be restored
        if (targetProfile.deleted_at) {
          return new Response(
            JSON.stringify({ success: false, error: 'Permanently deleted users cannot be restored' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Update profile to restore
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_disabled: false,
            disabled_at: null,
            disabled_by: null,
            deletion_reason: null,
          })
          .eq('id', user_id);

        if (updateError) {
          console.error('Error restoring user:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to restore user' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Audit log
        await supabaseAdmin
          .from('staff_audit_logs')
          .insert({
            actor_id: user.id,
            action: 'user_restored',
            target_user_id: user_id,
            metadata_json: {
              target_global_role: targetProfile.global_role,
            }
          });

        console.log(`User ${user_id} restored by ${user.id}`);

        return new Response(
          JSON.stringify({ success: true, message: 'User restored successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'delete_permanent': {
        // Soft-delete profile first
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            is_disabled: true,
            deleted_at: new Date().toISOString(),
            deleted_by: user.id,
            deletion_reason: reason || null,
            // Optionally scrub PII
            full_name: '[Deleted User]',
            username: `deleted_${user_id.slice(0, 8)}`,
          })
          .eq('id', user_id);

        if (updateError) {
          console.error('Error soft-deleting profile:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to delete user profile' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Delete all memberships
        const { data: deletedMemberships, error: membershipError } = await supabaseAdmin
          .from('resort_memberships')
          .delete()
          .eq('user_id', user_id)
          .select('id');

        if (membershipError) {
          console.error('Error deleting memberships:', membershipError);
          // Non-fatal, continue
        }

        // Cancel any pending invitations (by email if we had it, but we don't store email reliably)
        // Skip this for now as staff_invitations doesn't have user_id column

        // Delete auth user via Admin API
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (authDeleteError) {
          console.error('Error deleting auth user:', authDeleteError);
          // The profile is already soft-deleted, so user can't log in even if auth deletion fails
          // Continue and report partial success
        }

        // Audit log
        await supabaseAdmin
          .from('staff_audit_logs')
          .insert({
            actor_id: user.id,
            action: 'user_deleted_permanent',
            target_user_id: user_id,
            metadata_json: {
              reason: reason || null,
              target_global_role: targetProfile.global_role,
              memberships_removed: deletedMemberships?.length || 0,
              auth_deleted: !authDeleteError,
            }
          });

        console.log(`User ${user_id} permanently deleted by ${user.id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: authDeleteError 
              ? 'User profile deleted but auth cleanup incomplete. User cannot log in.' 
              : 'User permanently deleted',
            auth_deleted: !authDeleteError,
            memberships_removed: deletedMemberships?.length || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid mode' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
