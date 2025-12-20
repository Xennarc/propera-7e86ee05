import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffInviteRequest {
  email: string;
  name: string | null;
  username: string;
  resortName: string;
  resortId: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
  expiresAt: string;
  invitationId?: string;
  inviterName: string;
  inviteMessage?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
  RESERVATIONS: 'Reservations',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      email, 
      name, 
      username,
      resortName, 
      resortId, 
      role, 
      inviteLink, 
      expiresIn, 
      expiresAt,
      invitationId,
      inviterName,
      inviteMessage
    }: StaffInviteRequest = await req.json();

    // Validate required fields
    if (!resortId) {
      return new Response(
        JSON.stringify({ success: false, error: "Resort ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check authorization: user must be SUPER_ADMIN or RESORT_ADMIN for the specified resort
    const { data: profile } = await supabase
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = profile?.global_role === 'SUPER_ADMIN';

    if (!isSuperAdmin) {
      // Check if user is RESORT_ADMIN for this specific resort
      const { data: membership } = await supabase
        .from('resort_memberships')
        .select('resort_role')
        .eq('user_id', user.id)
        .eq('resort_id', resortId)
        .single();

      if (!membership || membership.resort_role !== 'RESORT_ADMIN') {
        console.error("User not authorized to send invitations for this resort");
        return new Response(
          JSON.stringify({ success: false, error: "Forbidden - insufficient permissions" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    console.log(`Sending staff invite email to ${email} for ${resortName} (authorized by user ${user.id})`);

    const roleLabel = ROLE_LABELS[role] || role;
    const greeting = name ? `Hi ${name},` : 'Hi,';
    const expiryDateFormatted = new Date(expiresAt).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Build personal note section if provided
    const personalNoteHtml = inviteMessage ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
        <p style="font-size: 14px; color: #92400e; margin: 0 0 8px 0; font-weight: 600;">Message from ${inviterName}:</p>
        <p style="font-size: 14px; color: #78350f; margin: 0; font-style: italic;">"${inviteMessage}"</p>
      </div>
    ` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Propera Staff Invitation</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0E7490 0%, #0891B2 50%, #06B6D4 100%); padding: 40px 30px; text-align: center;">
          <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 12px; margin-bottom: 20px;">
            <span style="color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Propera</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            You're invited to join<br/>${resortName}
          </h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <p style="font-size: 16px; margin-bottom: 24px; color: #374151;">${greeting}</p>
          
          <p style="font-size: 16px; margin-bottom: 24px; color: #374151;">
            <strong>${inviterName}</strong> has invited you to join the <strong>${resortName}</strong> team on Propera, our resort operations platform.
          </p>
          
          <!-- Details Card -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280;">Your Account Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Invited by</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${inviterName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Your Role</td>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; background: #0E7490; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">${roleLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Username</td>
                <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-family: monospace; font-weight: 600;">@${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Link expires</td>
                <td style="padding: 8px 0; color: #dc2626; font-size: 14px;">${expiryDateFormatted}</td>
              </tr>
            </table>
          </div>

          ${personalNoteHtml}
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #0E7490 0%, #0891B2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(14, 116, 144, 0.4); transition: transform 0.2s;">
              Accept Invitation
            </a>
          </div>
          
          <!-- Link Fallback -->
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 8px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #0E7490; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace;">
              ${inviteLink}
            </p>
          </div>
          
          <!-- Security Note -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="width: 32px; height: 32px; background: #ecfdf5; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span style="font-size: 16px;">🔒</span>
              </div>
              <div>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">
                  <strong style="color: #374151;">Security note:</strong> You'll set your own password when you accept this invitation. Never share your login credentials with anyone.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
          <p style="margin: 0;">© ${new Date().getFullYear()} Propera • Resort Operations Platform</p>
        </div>
        
      </body>
      </html>
    `;

    const plainText = `
You're invited to join ${resortName} on Propera

${greeting}

${inviterName} has invited you to join the ${resortName} team on Propera, our resort operations platform.

YOUR ACCOUNT DETAILS
--------------------
Invited by: ${inviterName}
Your Role: ${roleLabel}
Username: @${username}
Link expires: ${expiryDateFormatted}

${inviteMessage ? `MESSAGE FROM ${inviterName.toUpperCase()}:\n"${inviteMessage}"\n\n` : ''}
ACCEPT YOUR INVITATION
----------------------
Click or copy this link to set up your account:
${inviteLink}

SECURITY NOTE
-------------
You'll set your own password when you accept this invitation. Never share your login credentials with anyone.

---
If you weren't expecting this invitation, you can safely ignore this email.
© ${new Date().getFullYear()} Propera • Resort Operations Platform
    `;

    const emailResponse = await resend.emails.send({
      from: "Propera <reservations@propera.cc>",
      to: [email],
      subject: `You're invited to ${resortName} Staff Console on Propera`,
      html: emailHtml,
      text: plainText,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the action for audit
    await supabaseAdmin
      .from('staff_audit_logs')
      .insert({
        actor_id: user.id,
        action: 'invite_email_sent',
        resort_id: resortId,
        target_user_id: null,
        metadata_json: {
          email,
          name,
          username,
          role,
          invitation_id: invitationId || null
        }
      });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending staff invite email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
