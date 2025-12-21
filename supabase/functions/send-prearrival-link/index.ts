import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPrearrivalEmailRequest {
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  resortId: string;
  resortName: string;
  prearrivalLink: string;
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
    
    const primaryColor = resortPrimaryColor || '#0891b2';
    const subject = `Complete Your Pre-Arrival Check-in for ${resortName}`;
    const bodyPreview = `Dear ${firstName}, we're thrilled to be hosting you on ${formattedDate}. Please complete your online check-in.`;
    
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
    
    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Pre-Arrival Check-in</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); padding: 40px 40px 30px; text-align: center;">
              ${resortLogoUrl ? `<img src="${resortLogoUrl}" alt="${resortName}" style="max-height: 60px; margin-bottom: 16px;">` : ''}
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0; line-height: 1.3;">
                Welcome to ${resortName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 16px; color: #27272a; margin: 0 0 24px; line-height: 1.6;">
                Dear ${firstName},
              </p>
              
              <p style="font-size: 16px; color: #27272a; margin: 0 0 24px; line-height: 1.6;">
                We're thrilled to be hosting you on <strong>${formattedDate}</strong>. To help us prepare for your arrival, please take a moment to complete your online check-in.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${prearrivalLink}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 8px;">
                      Complete Your Check-in
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #71717a; margin: 0 0 24px; line-height: 1.6;">
                This quick process (2–3 minutes) allows you to:
              </p>
              
              <ul style="font-size: 14px; color: #52525b; margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
                <li>Confirm your arrival details and flight information</li>
                <li>Share any dietary preferences or allergies</li>
                <li>Let us know about special occasions</li>
                <li>Pre-book activities and dining experiences</li>
              </ul>
              
              <p style="font-size: 14px; color: #71717a; margin: 0 0 8px; line-height: 1.6;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              
              <p style="font-size: 12px; color: #a1a1aa; margin: 0 0 24px; word-break: break-all; line-height: 1.4;">
                ${prearrivalLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              
              <p style="font-size: 14px; color: #71717a; margin: 0; line-height: 1.6;">
                If you have any questions, please don't hesitate to reach out. We look forward to welcoming you!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="font-size: 12px; color: #a1a1aa; margin: 0; line-height: 1.5;">
                Warm regards,<br>
                <strong style="color: #71717a;">The ${resortName} Team</strong>
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
    
    // Try to update message log with failure (if we have context)
    // Note: This is a best-effort attempt
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
