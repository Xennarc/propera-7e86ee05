import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffInviteRequest {
  email: string;
  name: string | null;
  resortName: string;
  role: string;
  inviteLink: string;
  expiresIn: string;
}

const ROLE_LABELS: Record<string, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, resortName, role, inviteLink, expiresIn }: StaffInviteRequest = await req.json();

    console.log(`Sending staff invite email to ${email} for ${resortName}`);

    const roleLabel = ROLE_LABELS[role] || role;
    const greeting = name ? `Hi ${name},` : 'Hi,';

    const emailResponse = await resend.emails.send({
      from: "Propera <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join ${resortName} on Propera`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0E7490 0%, #0891B2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Propera</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">${greeting}</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been invited to join <strong>${resortName}</strong> as a <strong>${roleLabel}</strong> on Propera, our resort operations platform.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Click the button below to accept your invitation and set up your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; background: #0E7490; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #0E7490; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">
              ${inviteLink}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="font-size: 13px; color: #9ca3af;">
              This invitation expires in ${expiresIn}. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>Powered by Propera • Resort Operations Platform</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

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