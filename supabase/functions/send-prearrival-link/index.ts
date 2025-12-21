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

interface SendPrearrivalEmailRequest {
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  resortId: string;
  resortName: string;
  prearrivalLink: string; // May contain dev URLs - we extract token and rebuild with production URL
  resortLogoUrl?: string;
  resortPrimaryColor?: string;
}

// Extract token from any prearrival link and build production URL
function getPrearrivalProductionUrl(linkOrToken: string): string {
  // If it's already just a token (no slashes), use it directly
  if (!linkOrToken.includes('/')) {
    return `${PRODUCTION_URL}/prearrival/${linkOrToken}`;
  }
  
  // Extract token from URL path (handles any domain)
  const match = linkOrToken.match(/\/prearrival\/([^/?#]+)/);
  if (match && match[1]) {
    return `${PRODUCTION_URL}/prearrival/${match[1]}`;
  }
  
  // Fallback: try to get the last path segment
  const urlParts = linkOrToken.split('/');
  const token = urlParts[urlParts.length - 1];
  if (token) {
    return `${PRODUCTION_URL}/prearrival/${token}`;
  }
  
  // Last resort: return production URL with the original (should not happen)
  console.warn('Could not extract token from prearrival link:', linkOrToken);
  return linkOrToken;
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

    const body: SendPrearrivalEmailRequest = await req.json();
    const { guestId, guestName, guestEmail, checkInDate, resortId, resortName, prearrivalLink, resortLogoUrl, resortPrimaryColor } = body;

    // Validate required fields
    if (!guestEmail || !guestName || !prearrivalLink || !resortName || !resortId || !guestId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: guestEmail, guestName, prearrivalLink, resortName, resortId, guestId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstName = guestName.split(' ')[0];
    const formattedDate = new Date(checkInDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // ALWAYS use production URL for emails - extract token and rebuild
    const productionPrearrivalLink = getPrearrivalProductionUrl(prearrivalLink);
    console.log('Original link:', prearrivalLink);
    console.log('Production link:', productionPrearrivalLink);
    
    const primaryColor = resortPrimaryColor || '#0891b2';
    const subject = `Your stay at ${resortName} — complete online check-in`;
    const bodyPreview = `Dear ${firstName}, your stay begins ${formattedDate}. Complete your online check-in in just 3 minutes.`;
    
    // Create outbound message log entry (queued status)
    const { data: messageLog, error: logError } = await supabase
      .from('guest_outbound_messages')
      .insert({
        resort_id: resortId,
        guest_id: guestId,
        channel: 'email',
        template_key: 'prearrival_invite',
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
    
    // Build premium HTML email
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
                We're excited to welcome you soon! To ensure a seamless arrival, please take a moment to complete your online check-in.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="${productionPrearrivalLink}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 10px; box-shadow: 0 2px 8px ${primaryColor}40;">
                      Complete Your Check-in
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Benefits -->
              <table role="presentation" style="width: 100%; margin: 0 0 28px; background-color: #f8fafc; border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                      Takes just 3 minutes
                    </p>
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Confirm arrival details & flight information
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Share dietary preferences & allergies
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Let us know about special occasions
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; vertical-align: top; width: 24px;">
                          <span style="color: ${primaryColor}; font-size: 14px;">✓</span>
                        </td>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                          Pre-book activities & dining experiences
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- What happens next -->
              <table role="presentation" style="width: 100%; margin: 0 0 28px; border-left: 3px solid ${primaryColor}; background-color: ${primaryColor}08;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="font-size: 13px; color: #64748b; margin: 0 0 4px; font-weight: 600;">
                      What happens next?
                    </p>
                    <p style="font-size: 14px; color: #475569; margin: 0; line-height: 1.6;">
                      Once you arrive, this automatically becomes your <strong>Guest Portal</strong> — access your itinerary, book experiences, and more. No extra login needed.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Trust signals -->
              <table role="presentation" style="width: 100%; margin: 0 0 24px;">
                <tr>
                  <td align="center">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0; display: inline-flex; align-items: center; gap: 16px;">
                      <span>🔒 Secure link</span>
                      <span>•</span>
                      <span>⏱️ ~3 minutes</span>
                      <span>•</span>
                      <span>💾 Save & finish later</span>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback link -->
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="font-size: 11px; color: #cbd5e1; margin: 0; word-break: break-all; line-height: 1.5; background-color: #f8fafc; padding: 12px; border-radius: 6px;">
                ${productionPrearrivalLink}
              </p>
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
    console.log(`Sending pre-arrival email to ${guestEmail} for guest ${guestName}`);
    
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
    console.error("Error sending pre-arrival email:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
