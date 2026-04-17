-- Perfect Demo Resort: pool of 3 rotated identities
-- Creates credential storage, assignment counter, and RPCs.
-- Auth users are created lazily by the demo-enter edge function (idempotent).

-- 1. Credentials table (service_role only)
CREATE TABLE IF NOT EXISTS public.demo_credentials (
  slot smallint PRIMARY KEY CHECK (slot BETWEEN 0 AND 2),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  user_id uuid,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_credentials ENABLE ROW LEVEL SECURITY;
-- No policies = service_role only access.

-- 2. Assignment counter (single row)
CREATE TABLE IF NOT EXISTS public.demo_assignment_counter (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  next_slot smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.demo_assignment_counter (id, next_slot) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.demo_assignment_counter ENABLE ROW LEVEL SECURITY;

-- 3. Atomic next-slot RPC (security definer, public-callable but harmless)
CREATE OR REPLACE FUNCTION public.demo_get_next_slot()
RETURNS smallint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot smallint;
BEGIN
  UPDATE public.demo_assignment_counter
     SET next_slot = (next_slot + 1) % 3,
         updated_at = now()
   WHERE id = 1
  RETURNING ((next_slot + 2) % 3)::smallint INTO v_slot;
  -- Returning the slot we just consumed (pre-increment value)
  RETURN v_slot;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_get_next_slot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_get_next_slot() TO service_role;

-- 4. Seed slot rows (passwords filled in by edge function on first call)
INSERT INTO public.demo_credentials (slot, email, password)
VALUES
  (0, 'demo-staff-1@propera.cc', ''),
  (1, 'demo-staff-2@propera.cc', ''),
  (2, 'demo-staff-3@propera.cc', '')
ON CONFLICT (slot) DO NOTHING;

-- 5. Map existing demo guests to slots (101 Wilson, 102 Chen, 201 Miller)
UPDATE public.demo_credentials SET guest_id = (
  SELECT id FROM public.guests
   WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'
     AND room_number = '101' LIMIT 1
) WHERE slot = 0;

UPDATE public.demo_credentials SET guest_id = (
  SELECT id FROM public.guests
   WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'
     AND room_number = '102' LIMIT 1
) WHERE slot = 1;

UPDATE public.demo_credentials SET guest_id = (
  SELECT id FROM public.guests
   WHERE resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'
     AND room_number = '201' LIMIT 1
) WHERE slot = 2;

-- 6. Drop the daily demo-reset cron job if it exists.
-- Job name guess based on convention; ignore if missing.
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  -- Check pg_extension for cron presence
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR v_jobid IN
      SELECT jobid FROM cron.job
       WHERE command ILIKE '%demo-reset%'
          OR jobname ILIKE '%demo%reset%'
    LOOP
      PERFORM cron.unschedule(v_jobid);
    END LOOP;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- swallow: cron schema may not be accessible
  NULL;
END$$;

-- 7. Helper trigger for updated_at on demo_credentials
CREATE OR REPLACE FUNCTION public.touch_demo_credentials_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_demo_credentials ON public.demo_credentials;
CREATE TRIGGER trg_touch_demo_credentials
BEFORE UPDATE ON public.demo_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_demo_credentials_updated_at();