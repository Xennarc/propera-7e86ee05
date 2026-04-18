import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Production domain - ALWAYS use this for all external links
const PRODUCTION_URL = 'https://propera.cc';

interface SendCredentialsRequest {
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  resortId: string;
  resortName: string;
  resortCode: string;
  roomNumber: string;
  lastName: string;
  pin: string;
  resortLogoUrl?: string;
  resortPrimaryColor?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SendCredentialsRequest = await req.json();
    const { 
      guestId, guestName, guestEmail, checkInDate, 
      resortId, resortName, resortCode, 
      roomNumber, lastName, pin,
      resortLogoUrl, resortPrimaryColor 
    } = body;

    // Validate required fields
    if (!guestEmail || !guestName || !resortName || !resortId || !guestId || !roomNumber || !lastName || !pin || !resortCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Demo sandbox: never send credentials for the shared demo resort.
    if (resortId === "7819d1dc-485a-4309-a403-67c16c468f4b") {
      return new Response(
        JSON.stringify({ success: true, skipped: "demo" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = guestName.split(' ')[0];
    const formattedDate = new Date(checkInDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Build the portal URL with resort code
    const portalUrl = `${PRODUCTION_URL}/resort/${resortCode.toLowerCase()}/guest/login`;
    
    const primaryColor = resortPrimaryColor || '#0891b2';
    const subject = `Your stay at ${resortName} — login details`;
    const bodyPreview = `Dear ${firstName}, your stay begins ${formattedDate}. Here are your guest portal login credentials.`;
    
    // Create outbound message log entry (queued status)
    const { data: messageLog, error: logError } = await supabase
      .from('guest_outbound_messages')
      .insert({
        resort_id: resortId,
        guest_id: guestId,
        channel: 'email',
        template_key: 'guest_credentials',
        to_address: guestEmail,
        subject: subject,
        body_preview: bodyPreview,
        status: 'queued',
        created_by_staff_id: user.id,
      })
      .select('id')
      .single();

    if (logError) {
      console.error("Error creating message log:", logError);
      // Continue anyway, don't fail the send
    }
    
    // Build premium HTML email with login credentials
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Your stay at ${resortName}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); padding: 48px 40px 40px; text-align: center;">
              ${resortLogoUrl ? `<img src="${resortLogoUrl}" alt="${resortName}" style="max-height: 48px; margin-bottom: 20px;">` : ''}
              <h1 style="color: #ffffff; font-size: 26px; font-weight: 600; margin: 0; line-height: 1.3; letter-spacing: -0.02em;">
                Welcome to ${resortName}
              </h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 12px 0 0; line-height: 1.5;">
                Your stay begins ${formattedDate}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 20px; line-height: 1.6;">
                Dear ${firstName},
              </p>
              
              <p style="font-size: 16px; color: #1e293b; margin: 0 0 28px; line-height: 1.7;">
                We're excited to welcome you! Use the credentials below to access your Guest Portal — book activities, reserve restaurants, and complete your pre-arrival check-in.
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; margin: 0 0 28px; background-color: #f8fafc; border-radius: 12px; border: 2px solid ${primaryColor}20;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="font-size: 13px; color: ${primaryColor}; margin: 0 0 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">
                      Your Login Details
                    </p>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #64748b; width: 100px;">Portal:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-weight: 500;">
                          <a href="${portalUrl}" style="color: ${primaryColor}; text-decoration: none;">${portalUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Room:</td>
                        <td style="padding: 8px 0; font-size: 18px; color: #1e293b; font-weight: 600;">${roomNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Last Name:</td>
                        <td style="padding: 8px 0; font-size: 18px; color: #1e293b; font-weight: 600;">${lastName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #64748b;">PIN:</td>
                        <td style="padding: 8px 0; font-size: 22px; color: ${primaryColor}; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 4px;">${pin}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 10px; box-shadow: 0 2px 8px ${primaryColor}40;">
                      Access Guest Portal
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- What you can do -->
              <table role="presentation" style="width: 100%; margin: 0 0 28px; background-color: #f8fafc; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                      What you can do
                    </p>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Complete your pre-arrival check-in
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Browse and book activities & excursions
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Reserve restaurants & special dining experiences
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Share dietary preferences & special requests
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Trust signals -->
              <table role="presentation" style="width: 100%; margin: 0 0 24px;">
                <tr>
                  <td align="center">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0; display: inline-flex; align-items: center; gap: 16px;">
                      <span>🔒 Your PIN is private</span>
                      <span>•</span>
                      <span>📱 Works on any device</span>
                      <span>•</span>
                      <span>💾 Same login for your entire stay</span>
                    </p>
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 28px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #64748b; margin: 0 0 8px; line-height: 1.5;">
                Questions? Contact our guest services team.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
                Warm regards,<br>
                <strong style="color: #64748b;">The ${resortName} Team</strong>
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Sub-footer -->
        <table role="presentation" style="max-width: 560px; width: 100%; margin-top: 24px;">
          <tr>
            <td align="center">
              <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
                This email was sent to ${guestEmail} because you have an upcoming reservation.<br>
                Powered by <a href="https://propera.cc" style="color: #94a3b8;">Propera</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send email via Resend
    console.log(`Sending guest credentials email to ${guestEmail} for guest ${guestName}`);
    
    const emailResponse = await resend.emails.send({
      from: `${resortName} <reservations@propera.cc>`,
      to: [guestEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update message log with success
    if (messageLog?.id) {
      await supabase
        .from('guest_outbound_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: emailResponse.data?.id || null,
        })
        .eq('id', messageLog.id);
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse, messageId: messageLog?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending guest credentials email:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
