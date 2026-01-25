import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { resortCode, room, last, pin, exp, sig } = body;

    // Validate required fields
    if (!resortCode || !room || !last || !pin || !exp || !sig) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "MISSING_PARAMS",
          message: "Invalid QR code parameters.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get signing secret
    const qrSecret = Deno.env.get("QR_LOGIN_SECRET");
    if (!qrSecret) {
      console.error("QR_LOGIN_SECRET not configured");
      return new Response(
        JSON.stringify({
          valid: false,
          error: "SERVER_ERROR",
          message: "Server configuration error. Please try again later.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry first (Unix timestamp in seconds)
    const expiryTimestamp = parseInt(exp, 10);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (isNaN(expiryTimestamp) || expiryTimestamp <= nowSeconds) {
      console.log(`QR expired: exp=${expiryTimestamp}, now=${nowSeconds}`);
      return new Response(
        JSON.stringify({
          valid: false,
          error: "EXPIRED",
          message: "This QR code has expired. Please ask staff for a new one.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reconstruct payload for verification: resortCode|room|last|pin|exp
    const normalizedResortCode = resortCode.toLowerCase();
    const payload = `${normalizedResortCode}|${room}|${last}|${pin}|${exp}`;

    // Generate expected signature
    const expectedSignature = await hmacSign(qrSecret, payload);

    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeCompare(sig, expectedSignature)) {
      console.log(`Invalid signature for resort ${resortCode}, room ${room}`);
      return new Response(
        JSON.stringify({
          valid: false,
          error: "INVALID_SIGNATURE",
          message: "This QR code is invalid.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Signature valid and not expired - return validated params
    console.log(`QR validated successfully for resort ${resortCode}, room ${room}`);

    return new Response(
      JSON.stringify({
        valid: true,
        resortCode: normalizedResortCode,
        roomNumber: room,
        lastName: last,
        pin: pin,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "SERVER_ERROR",
        message: "An error occurred. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
