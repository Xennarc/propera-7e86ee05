import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = 'https://propera.cc';

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify token and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const body = await req.json();
    const { guestId, expiryMinutes = 10 } = body;

    if (!guestId) {
      return new Response(
        JSON.stringify({ success: false, error: "guestId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch guest details including resort info
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select(`
        id,
        full_name,
        room_number,
        resort_id,
        resorts!inner (
          id,
          code,
          name
        )
      `)
      .eq("id", guestId)
      .single();

    if (guestError || !guest) {
      console.error("Guest fetch error:", guestError);
      return new Response(
        JSON.stringify({ success: false, error: "Guest not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify staff has access to this resort
    const { data: membership, error: membershipError } = await supabase
      .from("resort_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("resort_id", guest.resort_id)
      .maybeSingle();

    // Also check for super admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role")
      .eq("id", userId)
      .single();

    const isSuperAdmin = profile?.global_role === "SUPER_ADMIN";
    const hasResortAccess = !!membership;

    if (!isSuperAdmin && !hasResortAccess) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied to this resort" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a fresh PIN for the guest
    const { data: pinData, error: pinError } = await supabase.rpc("generate_guest_pin", {
      p_guest_id: guestId,
    });

    if (pinError || !pinData?.success) {
      console.error("PIN generation error:", pinError, pinData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const freshPin = pinData.pin;

    // Extract last name from full name (last word)
    const nameParts = guest.full_name.trim().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];

    // Get resort code - resorts is an object from !inner join
    const resortData = guest.resorts as unknown as { id: string; code: string; name: string };
    const resortCode = resortData.code.toLowerCase();

    // Calculate expiry timestamp (Unix seconds)
    const expirySeconds = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    // Build payload for signing: resortCode|room|last|pin|exp
    const payload = `${resortCode}|${guest.room_number}|${lastName}|${freshPin}|${expirySeconds}`;

    // Get signing secret
    const qrSecret = Deno.env.get("QR_LOGIN_SECRET");
    if (!qrSecret) {
      console.error("QR_LOGIN_SECRET not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate HMAC signature
    const signature = await hmacSign(qrSecret, payload);

    // Build signed URL
    const encodedRoom = encodeURIComponent(guest.room_number);
    const encodedLast = encodeURIComponent(lastName);
    const url = `${PRODUCTION_URL}/resort/${resortCode}/guest/login?room=${encodedRoom}&last=${encodedLast}&pin=${freshPin}&exp=${expirySeconds}&sig=${signature}&autologin=1`;

    // Calculate expiry ISO string
    const expiresAt = new Date(expirySeconds * 1000).toISOString();

    console.log(`Generated signed QR URL for guest ${guestId}, expires at ${expiresAt}`);

    return new Response(
      JSON.stringify({
        success: true,
        url,
        expiresAt,
        pin: freshPin, // Return PIN so staff can communicate it if needed
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
