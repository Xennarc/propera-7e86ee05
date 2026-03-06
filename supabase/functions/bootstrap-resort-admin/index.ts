import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://propera.cc",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = 'https://propera.cc';

interface BootstrapResortAdminRequest {
  resortId: string;
  resortName: string;
  resortCode: string;
  adminEmail: string;
  adminUsername: string;
  adminFullName: string;
}

// Generate a strong random password (16 chars with letters, numbers, symbols)
function generateTempPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'; // No confusing chars like I, l, O, 0
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const all = letters + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += letters.charAt(Math.floor(Math.random() * letters.length));
  password += letters.charAt(Math.floor(Math.random() * letters.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Fill rest with random chars
  for (let i = 5; i < 16; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

serve(async (req) => {
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

    // Check if user is SUPER_ADMIN
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('global_role')
      .eq('id', user.id)
      .single();

    if (profile?.global_role !== 'SUPER_ADMIN') {
      console.error("Non-SUPER_ADMIN attempted to bootstrap resort admin");
      return new Response(
        JSON.stringify({ success: false, error: "Only Super Admins can bootstrap resort admins" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      resortId,
      resortName,
      resortCode,
      adminEmail, 
      adminUsername,
      adminFullName
    }: BootstrapResortAdminRequest = await req.json();

    // Validate inputs
    if (!resortId || !adminEmail || !adminUsername) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();
    const normalizedUsername = adminUsername.trim().toLowerCase();

    // Validate username format
    if (!/^[a-z0-9._]{3,24}$/.test(normalizedUsername)) {
      return new Response(
        JSON.stringify({ success: false, error: "Username must be 3-24 chars, lowercase letters, numbers, dots, underscores only" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if username already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername)
      .single();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: false, error: "Username is already taken" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: "That email is already used by another staff account. Use a different email." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const tempPasswordExpiresAt = new Date();
    tempPasswordExpiresAt.setDate(tempPasswordExpiresAt.getDate() + 7); // 7 days

    console.log(`Creating bootstrap admin for resort ${resortId}: ${normalizedUsername} / ${normalizedEmail}`);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminFullName || '',
      }
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || 'Failed to create user account' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile with username, global role, and password reset flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: normalizedUsername,
        full_name: adminFullName || '',
        global_role: 'STANDARD',
        must_reset_password: true,
        temp_password_expires_at: tempPasswordExpiresAt.toISOString()
      })
      .eq('id', authData.user.id);

    if (profileUpdateError) {
      console.error('Profile error:', profileUpdateError);
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create profile' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create resort membership with RESORT_ADMIN role
    const { error: membershipError } = await supabaseAdmin
      .from('resort_memberships')
      .insert({
        user_id: authData.user.id,
        resort_id: resortId,
        resort_role: 'RESORT_ADMIN',
        department: 'Management'
      });

    if (membershipError) {
      console.error('Membership error:', membershipError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create resort membership' }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log the audit entry
    await supabaseAdmin
      .from('staff_audit_logs')
      .insert({
        actor_id: user.id,
        action: 'BOOTSTRAP_RESORT_ADMIN_CREATED',
        resort_id: resortId,
        target_user_id: authData.user.id,
        metadata_json: {
          username: normalizedUsername,
          email: normalizedEmail,
          resort_name: resortName
        }
      });

    // Send welcome credentials email
    const expiryDateFormatted = tempPasswordExpiresAt.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const signInLink = `${PRODUCTION_URL}/staff/auth?username=${encodeURIComponent(normalizedUsername)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Resort Admin Access</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0E7490 0%, #0891B2 50%, #06B6D4 100%); padding: 40px 30px; text-align: center;">
          <div style="display: inline-block; background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 12px; margin-bottom: 20px;">
            <span style="color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Propera</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
            Your Resort Admin account is ready
          </h1>
          <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">
            ${resortName}
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <p style="font-size: 16px; margin-bottom: 24px; color: #374151;">
            ${adminFullName ? `Hi ${adminFullName},` : 'Hi,'}
          </p>
          
          <p style="font-size: 16px; margin-bottom: 24px; color: #374151;">
            You now have full admin access for <strong>${resortName}</strong> in Propera's Staff Console. Use the credentials below to sign in.
          </p>
          
          <!-- Credentials Card -->
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #0E7490; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #0E7490;">Your Login Credentials</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 140px; border-bottom: 1px solid #e2e8f0;">Username</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #1f2937; background: #fff; padding: 4px 8px; border-radius: 4px;">${normalizedUsername}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Temporary Password</td>
                <td style="padding: 12px 0;">
                  <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #1f2937; background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${tempPassword}</span>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Important Note -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="font-size: 14px; color: #92400e; margin: 0; font-weight: 600;">
              ⚠️ You will be asked to set a new password on first login.
            </p>
            <p style="font-size: 13px; color: #78350f; margin: 8px 0 0 0;">
              This temporary password expires on ${expiryDateFormatted}.
            </p>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signInLink}" style="display: inline-block; background: linear-gradient(135deg, #0E7490 0%, #0891B2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(14, 116, 144, 0.4);">
              Sign in to Staff Console
            </a>
          </div>
          
          <!-- Link Fallback -->
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #9ca3af; margin-bottom: 8px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #0E7490; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace;">
              ${signInLink}
            </p>
          </div>
          
          <!-- Help Note -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
            <p style="font-size: 13px; color: #6b7280; margin: 0;">
              If you weren't expecting this, ignore this email or contact Propera support.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} Propera • Resort Operations Platform</p>
        </div>
        
      </body>
      </html>
    `;

    const plainText = `
Your Resort Admin account is ready — ${resortName}

${adminFullName ? `Hi ${adminFullName},` : 'Hi,'}

You now have full admin access for ${resortName} in Propera's Staff Console.

YOUR LOGIN CREDENTIALS
----------------------
Username: ${normalizedUsername}
Temporary Password: ${tempPassword}

⚠️ IMPORTANT: You will be asked to set a new password on first login.
This temporary password expires on ${expiryDateFormatted}.

SIGN IN NOW
-----------
${signInLink}

---
If you weren't expecting this, ignore this email or contact Propera support.
© ${new Date().getFullYear()} Propera • Resort Operations Platform
    `;

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailResponse = await resend.emails.send({
        from: "Propera <reservations@propera.cc>",
        to: [normalizedEmail],
        subject: `Welcome to Propera — your Resort Admin access for ${resortName}`,
        html: emailHtml,
        text: plainText,
      });

      console.log("Welcome email sent successfully:", emailResponse);
      emailSent = true;

      // Log email sent
      await supabaseAdmin
        .from('staff_audit_logs')
        .insert({
          actor_id: user.id,
          action: 'BOOTSTRAP_EMAIL_SENT',
          resort_id: resortId,
          target_user_id: authData.user.id,
          metadata_json: {
            email: normalizedEmail,
            username: normalizedUsername
          }
        });
    } catch (emailErr: any) {
      console.error("Failed to send welcome email:", emailErr);
      emailError = emailErr.message || 'Email sending failed';

      // Log email failure
      await supabaseAdmin
        .from('staff_audit_logs')
        .insert({
          actor_id: user.id,
          action: 'BOOTSTRAP_EMAIL_FAILED',
          resort_id: resortId,
          target_user_id: authData.user.id,
          metadata_json: {
            email: normalizedEmail,
            error: emailError
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        email: normalizedEmail,
        username: normalizedUsername,
        email_sent: emailSent,
        email_error: emailError,
        // Only include temp password if email failed (one-time display)
        temp_password: emailSent ? null : tempPassword,
        sign_in_link: signInLink
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in bootstrap-resort-admin:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An internal error occurred. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
