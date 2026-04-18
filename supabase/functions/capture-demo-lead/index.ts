// Public endpoint to capture demo follow-up leads from /book-demo.
// No JWT required. Validates input server-side and upserts via service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const email = clean(payload.email, 255)?.toLowerCase() ?? null;
  if (!email || !EMAIL_RE.test(email)) {
    return json(400, { error: "Valid email required" });
  }

  const name = clean(payload.name, 120);
  const resort_name = clean(payload.resort_name, 200);
  const role = clean(payload.role, 80);
  const source = clean(payload.source, 80) ?? "book-demo";
  const utm_source = clean(payload.utm_source, 120);
  const utm_medium = clean(payload.utm_medium, 120);
  const utm_campaign = clean(payload.utm_campaign, 120);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await admin
    .from("demo_leads")
    .upsert(
      {
        email,
        name,
        resort_name,
        role,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );

  if (error) {
    console.error("[capture-demo-lead] insert failed", error);
    return json(500, { error: "Failed to save lead" });
  }

  return json(200, { ok: true });
});
