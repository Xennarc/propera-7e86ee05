

## Goal
Update `/book-demo` to reflect the new instant-access reality (no provisioning wait, 3 rotated personas, auto-login) while still capturing leads/emails for sales follow-up.

## Investigation
<lov-tool-use id="toolu_vrtx_01R94kQYB74iq3ji42yxWHjx" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/BookDemoPage.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01G1tLLWFtGv4r1G3UaHs3qo" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/BookDemoPage.tsx\"}">
</lov-tool-use>
<lov-plan>

## Goal
Refresh the `/book-demo` page so the copy matches the new "instant, no-login, 3-rotated-personas" reality, AND add an optional lead capture (email + optional name/role/resort) that doesn't block entry.

## Current state
- Hero already has "Enter as Guest" / "Enter as Staff" buttons → keep.
- Copy still says "Uses your email only to create access" and "60 seconds to start" → misleading (no email needed now).
- No lead capture exists; previous wizard collected emails but was removed.
- `LiveDemoQualifier` component still wired for walkthrough path → keep.

## Approach

### 1. Update copy to reflect new reality
- Hero subhead: emphasize "no signup, no email, instant access".
- Remove "Uses your email only to create access" line under instant card.
- Update STEPS: "1. Click Enter — you're in" / "2. Explore as a guest or as staff" / "3. Book a call when ready".
- Update FAQ entries about emails/signup.
- Trust chips: add "No signup required".

### 2. Add optional lead capture (non-blocking)
- New small section between hero and "Two paths" (or as a slim card under the hero CTAs): **"Want us to follow up?"**
  - Fields: email (required if submitting), name (optional), resort name (optional), role (optional select).
  - Single "Send" button → inserts into existing `demo_leads` table (already used historically by `provision-demo`) via direct supabase client insert with public RLS insert policy, or via a tiny new edge function `capture-demo-lead`.
  - Success state: inline checkmark + "Thanks — we'll be in touch."
- Crucially: **does NOT gate demo entry**. Hero buttons remain primary.

### 3. Lead storage
- Check `demo_leads` table exists & has appropriate insert policy. If not, migration adds:
  - Table `demo_leads` (id, email, name, resort_name, role, source, utm_*, created_at) — likely already exists.
  - Public anon `INSERT` RLS policy (no SELECT for anon).
- Prefer a thin edge function `capture-demo-lead` (no JWT) that validates email server-side and inserts via service role — keeps anon writes locked down.

### 4. Component changes
- `src/pages/BookDemoPage.tsx`: copy edits + render new `<DemoLeadCaptureCard />`.
- `src/components/demo/DemoLeadCaptureCard.tsx`: **new**. Zod-validated form (email required, max lengths), calls `capture-demo-lead`.
- `supabase/functions/capture-demo-lead/index.ts`: **new**. Validates input, inserts row, returns `{ok:true}`. Public.
- `supabase/config.toml`: register function with `verify_jwt = false`.
- Migration only if `demo_leads` table is missing.

### 5. Verification
- Visit `/book-demo` → copy reflects instant access, no email mention on CTAs.
- Submit lead form with email only → success toast, row in `demo_leads`.
- Click "Enter as Guest" without filling form → still works.

## Files touched
- `src/pages/BookDemoPage.tsx` (copy + insert lead card)
- `src/components/demo/DemoLeadCaptureCard.tsx` (new)
- `supabase/functions/capture-demo-lead/index.ts` (new)
- `supabase/config.toml` (register function)
- Migration for `demo_leads` table (only if missing — will check first)

