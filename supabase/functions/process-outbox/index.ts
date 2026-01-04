import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;

interface OutboxEvent {
  id: string;
  resort_id: string;
  event_type: string;
  payload: Record<string, any>;
  attempts: number;
}

interface ProcessResult {
  eventId: string;
  success: boolean;
  error?: string;
}

// Get Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Get Resend client (may be null if not configured)
function getResend(): Resend | null {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  return apiKey ? new Resend(apiKey) : null;
}

// Create in-app notification for staff
async function createStaffNotification(
  supabase: any,
  resortId: string,
  type: string,
  title: string,
  message: string,
  linkUrl: string | null,
  roles: string[]
): Promise<void> {
  await supabase.rpc("create_staff_notifications_for_roles", {
    p_resort_id: resortId,
    p_roles: roles,
    p_type: type,
    p_title: title,
    p_message: message,
    p_link_url: linkUrl,
  });
}

// Create in-app notification for guest
async function createGuestNotification(
  supabase: any,
  resortId: string,
  guestId: string,
  type: string,
  title: string,
  message: string,
  linkUrl: string | null
): Promise<void> {
  await supabase.rpc("create_guest_notification", {
    p_resort_id: resortId,
    p_guest_id: guestId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_link_url: linkUrl,
  });
}

// Send email notification
async function sendEmail(
  resend: Resend,
  to: string,
  subject: string,
  htmlContent: string,
  fromName: string = "Propera"
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await resend.emails.send({
      from: `${fromName} <notifications@propera.cc>`,
      to: [to],
      subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error?.message || "Email send failed" };
  }
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Process activity booking events
async function processActivityBookingEvent(
  supabase: any,
  resend: Resend | null,
  event: OutboxEvent
): Promise<{ success: boolean; error?: string }> {
  const { event_type, payload, resort_id } = event;
  const {
    booking_id,
    guest_id,
    guest_name,
    guest_email,
    room_number,
    activity_name,
    session_date,
    session_time,
    status,
    requires_approval,
  } = payload;

  const dateStr = formatDate(session_date);
  const timeStr = session_time?.slice(0, 5) || "TBD";

  try {
    // Create in-app notifications based on event type
    switch (event_type) {
      case "ACTIVITY_BOOKING_CREATED": {
        // Notify guest
        const guestTitle = requires_approval ? "Booking Request Received" : "Booking Confirmed";
        const guestMsg = requires_approval
          ? `Your request for ${activity_name} on ${dateStr} at ${timeStr} is pending approval.`
          : `Your booking for ${activity_name} on ${dateStr} at ${timeStr} is confirmed!`;
        const guestType = requires_approval ? "ACTIVITY_BOOKING_PENDING" : "ACTIVITY_BOOKING_CONFIRMED";

        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          guestType,
          guestTitle,
          guestMsg,
          `/guest/bookings`
        );

        // Notify staff if requires approval
        if (requires_approval) {
          const staffMsg = `${guest_name} (Room ${room_number}) requested ${activity_name} on ${dateStr} at ${timeStr}.`;
          await createStaffNotification(
            supabase,
            resort_id,
            "ACTIVITY_BOOKING_PENDING",
            "New Activity Request",
            staffMsg,
            `/activities/sessions`,
            ["ACTIVITIES", "RESORT_ADMIN"]
          );
        }

        // Send email if configured
        if (resend && guest_email) {
          const emailSubject = guestTitle;
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0f172a;">${guestTitle}</h2>
              <p>Dear ${guest_name?.split(" ")[0] || "Guest"},</p>
              <p>${guestMsg}</p>
              <p><strong>Activity:</strong> ${activity_name}<br/>
              <strong>Date:</strong> ${dateStr}<br/>
              <strong>Time:</strong> ${timeStr}</p>
              <p>Best regards,<br/>The Team</p>
            </div>
          `;
          const emailResult = await sendEmail(resend, guest_email, emailSubject, emailHtml);
          if (!emailResult.success) {
            console.warn("Email failed but continuing:", emailResult.error);
          }
        }
        break;
      }

      case "ACTIVITY_BOOKING_CONFIRMED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "ACTIVITY_BOOKING_CONFIRMED",
          "Booking Confirmed!",
          `Your booking for ${activity_name} on ${dateStr} at ${timeStr} has been confirmed.`,
          `/guest/bookings`
        );

        if (resend && guest_email) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Booking Confirmed!</h2>
              <p>Dear ${guest_name?.split(" ")[0] || "Guest"},</p>
              <p>Great news! Your booking has been confirmed.</p>
              <p><strong>Activity:</strong> ${activity_name}<br/>
              <strong>Date:</strong> ${dateStr}<br/>
              <strong>Time:</strong> ${timeStr}</p>
              <p>We look forward to seeing you!</p>
            </div>
          `;
          await sendEmail(resend, guest_email, "Booking Confirmed", emailHtml);
        }
        break;
      }

      case "ACTIVITY_BOOKING_CANCELLED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "ACTIVITY_BOOKING_CANCELLED",
          "Booking Cancelled",
          `Your booking for ${activity_name} on ${dateStr} at ${timeStr} has been cancelled.`,
          `/guest/bookings`
        );
        break;
      }

      case "ACTIVITY_BOOKING_REJECTED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "ACTIVITY_BOOKING_CANCELLED",
          "Booking Not Available",
          `Unfortunately, your request for ${activity_name} on ${dateStr} could not be accommodated.`,
          `/guest/bookings`
        );

        if (resend && guest_email) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Booking Request Update</h2>
              <p>Dear ${guest_name?.split(" ")[0] || "Guest"},</p>
              <p>We regret that your request for ${activity_name} on ${dateStr} at ${timeStr} could not be accommodated.</p>
              <p>Please contact our guest services for alternative options.</p>
            </div>
          `;
          await sendEmail(resend, guest_email, "Booking Request Update", emailHtml);
        }
        break;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error processing ${event_type}:`, error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// Process restaurant reservation events
async function processRestaurantReservationEvent(
  supabase: any,
  resend: Resend | null,
  event: OutboxEvent
): Promise<{ success: boolean; error?: string }> {
  const { event_type, payload, resort_id } = event;
  const {
    reservation_id,
    guest_id,
    guest_name,
    guest_email,
    room_number,
    restaurant_name,
    slot_date,
    slot_time,
    num_adults,
    num_children,
    requires_approval,
  } = payload;

  const dateStr = formatDate(slot_date);
  const timeStr = slot_time?.slice(0, 5) || "TBD";
  const pax = (num_adults || 0) + (num_children || 0);

  try {
    switch (event_type) {
      case "RESTAURANT_RESERVATION_CREATED": {
        const guestTitle = requires_approval ? "Reservation Request Received" : "Reservation Confirmed";
        const guestMsg = requires_approval
          ? `Your reservation at ${restaurant_name} on ${dateStr} at ${timeStr} is pending confirmation.`
          : `Your table at ${restaurant_name} on ${dateStr} at ${timeStr} is confirmed!`;
        const guestType = requires_approval ? "RESTAURANT_RESERVATION_PENDING" : "RESTAURANT_RESERVATION_CONFIRMED";

        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          guestType,
          guestTitle,
          guestMsg,
          `/guest/bookings`
        );

        if (requires_approval) {
          const staffMsg = `${guest_name} (Room ${room_number}) requested ${restaurant_name} on ${dateStr} at ${timeStr} for ${pax} guests.`;
          await createStaffNotification(
            supabase,
            resort_id,
            "RESTAURANT_RESERVATION_PENDING",
            "New Dining Request",
            staffMsg,
            `/restaurants/slots`,
            ["FNB", "RESORT_ADMIN"]
          );
        }

        if (resend && guest_email) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>${guestTitle}</h2>
              <p>Dear ${guest_name?.split(" ")[0] || "Guest"},</p>
              <p>${guestMsg}</p>
              <p><strong>Restaurant:</strong> ${restaurant_name}<br/>
              <strong>Date:</strong> ${dateStr}<br/>
              <strong>Time:</strong> ${timeStr}<br/>
              <strong>Party size:</strong> ${pax}</p>
            </div>
          `;
          await sendEmail(resend, guest_email, guestTitle, emailHtml);
        }
        break;
      }

      case "RESTAURANT_RESERVATION_CONFIRMED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "RESTAURANT_RESERVATION_CONFIRMED",
          "Reservation Confirmed!",
          `Your table at ${restaurant_name} on ${dateStr} at ${timeStr} is confirmed.`,
          `/guest/bookings`
        );

        if (resend && guest_email) {
          const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Reservation Confirmed!</h2>
              <p>Dear ${guest_name?.split(" ")[0] || "Guest"},</p>
              <p>Your table at ${restaurant_name} has been confirmed.</p>
              <p><strong>Date:</strong> ${dateStr}<br/>
              <strong>Time:</strong> ${timeStr}<br/>
              <strong>Party size:</strong> ${pax}</p>
            </div>
          `;
          await sendEmail(resend, guest_email, "Reservation Confirmed", emailHtml);
        }
        break;
      }

      case "RESTAURANT_RESERVATION_CANCELLED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "RESTAURANT_RESERVATION_CANCELLED",
          "Reservation Cancelled",
          `Your reservation at ${restaurant_name} on ${dateStr} at ${timeStr} has been cancelled.`,
          `/guest/bookings`
        );
        break;
      }

      case "RESTAURANT_RESERVATION_REJECTED": {
        await createGuestNotification(
          supabase,
          resort_id,
          guest_id,
          "RESTAURANT_RESERVATION_CANCELLED",
          "Reservation Not Available",
          `Unfortunately, your request at ${restaurant_name} on ${dateStr} could not be accommodated.`,
          `/guest/bookings`
        );
        break;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error processing ${event_type}:`, error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// Process prearrival events
async function processPrearrivalEvent(
  supabase: any,
  event: OutboxEvent
): Promise<{ success: boolean; error?: string }> {
  // Prearrival sent events don't need additional processing
  // The email was already sent by the send-prearrival-link function
  // This is mainly for tracking/audit purposes
  console.log(`Prearrival event processed: ${event.payload.message_id}`);
  return { success: true };
}

// Process demo expiring events
async function processDemoExpiringEvent(
  supabase: any,
  resend: Resend | null,
  event: OutboxEvent
): Promise<{ success: boolean; error?: string }> {
  const { resort_id, payload } = event;
  const { workspace_id, email, resort_name, expires_at, days_remaining } = payload;

  try {
    // Create in-app notification for staff
    await createStaffNotification(
      supabase,
      resort_id,
      "DEMO_RESORT_EXPIRING_SOON",
      "Demo Expiring Soon",
      `Your demo for ${resort_name} expires in ${days_remaining} days. Contact us to upgrade!`,
      null,
      ["RESORT_ADMIN"]
    );

    // Send email reminder
    if (resend && email) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Demo is Expiring Soon</h2>
          <p>Your demo for <strong>${resort_name}</strong> will expire in ${days_remaining} days.</p>
          <p>Ready to upgrade? Contact us to keep your data and unlock all features.</p>
          <a href="https://propera.cc/pricing" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            View Plans
          </a>
        </div>
      `;
      await sendEmail(resend, email, `Your ${resort_name} Demo Expires in ${days_remaining} Days`, emailHtml);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error processing demo expiring event:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

// Main event processor
async function processEvent(
  supabase: any,
  resend: Resend | null,
  event: OutboxEvent
): Promise<{ success: boolean; error?: string }> {
  const { event_type } = event;

  console.log(`Processing event: ${event.id} (${event_type})`);

  if (event_type.startsWith("ACTIVITY_BOOKING_")) {
    return processActivityBookingEvent(supabase, resend, event);
  } else if (event_type.startsWith("RESTAURANT_RESERVATION_")) {
    return processRestaurantReservationEvent(supabase, resend, event);
  } else if (event_type === "PREARRIVAL_SENT") {
    return processPrearrivalEvent(supabase, event);
  } else if (event_type === "DEMO_EXPIRING") {
    return processDemoExpiringEvent(supabase, resend, event);
  } else {
    console.warn(`Unknown event type: ${event_type}`);
    return { success: true }; // Mark as done to avoid infinite retries
  }
}

// Main handler
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: ProcessResult[] = [];

  try {
    const supabase = getSupabaseAdmin();
    const resend = getResend();

    // Claim pending events
    const { data: events, error: claimError } = await supabase.rpc("claim_outbox_events", {
      p_limit: BATCH_SIZE,
    });

    if (claimError) {
      console.error("Failed to claim events:", claimError);
      throw claimError;
    }

    if (!events || events.length === 0) {
      console.log("No pending events to process");
      return new Response(
        JSON.stringify({ processed: 0, duration_ms: Date.now() - startTime }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${events.length} events`);

    // Process each event
    for (const event of events) {
      const result = await processEvent(supabase, resend, event);

      if (result.success) {
        await supabase.rpc("mark_outbox_done", { p_event_id: event.id });
        results.push({ eventId: event.id, success: true });
      } else {
        await supabase.rpc("mark_outbox_failed", {
          p_event_id: event.id,
          p_error: result.error || "Unknown error",
          p_max_attempts: MAX_ATTEMPTS,
        });
        results.push({ eventId: event.id, success: false, error: result.error });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`Processed ${events.length} events: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        processed: events.length,
        success: successCount,
        failed: failCount,
        duration_ms: Date.now() - startTime,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Outbox processor error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
