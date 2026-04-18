-- =========================================================================
-- Demo Sandbox Isolation
-- =========================================================================
-- Hard boundary preventing the shared DEMO resort (id 7819d1dc-485a-4309-
-- a403-67c16c468f4b) from polluting audit logs, notifications, or the
-- event_outbox in production. Triggers silently swallow inserts that
-- originate from the demo. Edge functions also short-circuit, but this
-- is the belt-and-braces guarantee.
-- =========================================================================

-- 1. Helper: is the current operation in the demo resort context?
CREATE OR REPLACE FUNCTION public.is_demo_resort(p_resort_id uuid)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_resort_id = '7819d1dc-485a-4309-a403-67c16c468f4b'::uuid;
$$;

COMMENT ON FUNCTION public.is_demo_resort IS
  'Returns true when the given resort_id is the shared demo resort. Used by sandbox triggers.';

-- 2. Generic drop-on-insert trigger for tables with a resort_id column.
CREATE OR REPLACE FUNCTION public.drop_demo_resort_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.resort_id IS NOT NULL
     AND public.is_demo_resort(NEW.resort_id) THEN
    -- Silently drop the write; UI receives a successful no-op.
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.drop_demo_resort_writes IS
  'BEFORE INSERT trigger that swallows writes for the demo resort. Used on audit + notification tables.';

-- 3. Attach trigger to every audit + notification table that has resort_id.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'audit_logs',
      'booking_audit_logs',
      'access_audit_log',
      'admin_audit_logs',
      'admin_notifications'
    ])
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'resort_id'
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%I_drop_demo ON public.%I;',
        t, t
      );
      EXECUTE format(
        'CREATE TRIGGER trg_%I_drop_demo
           BEFORE INSERT ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.drop_demo_resort_writes();',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- 4. event_outbox: also drop demo writes at the trigger level. Belt to
-- the edge-function suspenders (process-outbox already short-circuits
-- but this prevents accumulation if a producer queues a demo event).
DROP TRIGGER IF EXISTS trg_event_outbox_drop_demo ON public.event_outbox;
CREATE TRIGGER trg_event_outbox_drop_demo
  BEFORE INSERT ON public.event_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.drop_demo_resort_writes();

-- 5. notifications + staff_audit_logs + platform_audit_log: these don't
-- have resort_id, so they're handled at the edge-function layer instead.
-- We document that here for future maintainers.
COMMENT ON TABLE public.notifications IS
  'No demo trigger: lacks resort_id. Demo writes are blocked at the producer (edge functions / RPCs).';
COMMENT ON TABLE public.staff_audit_logs IS
  'No demo trigger: lacks resort_id. Demo writes are blocked at the producer.';
COMMENT ON TABLE public.platform_audit_log IS
  'No demo trigger: lacks resort_id. Demo writes are blocked at the producer.';
