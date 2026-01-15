-- Server-side protection for demo resort writes
-- Block inserts/updates/deletes on demo resort when actor is the demo staff user

-- Create a helper function to check if this is a demo write attempt
CREATE OR REPLACE FUNCTION public.is_demo_write_blocked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Returns TRUE if the write should be blocked (demo resort + demo staff user)
  SELECT EXISTS (
    SELECT 1
    FROM public.resorts r
    WHERE r.is_demo = true
      AND r.code = 'DEMO'
      AND auth.uid() IN (
        -- Get the demo staff user ID from the shared demo workspace
        SELECT dw.staff_user_id 
        FROM public.demo_workspaces dw 
        WHERE dw.email = '__shared_demo__'
          AND dw.staff_user_id IS NOT NULL
      )
  );
$$;

-- Add RLS policies to block demo writes on activities table
CREATE POLICY "Block demo resort activity inserts" ON public.activities
FOR INSERT
WITH CHECK (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort activity updates" ON public.activities
FOR UPDATE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort activity deletes" ON public.activities
FOR DELETE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

-- Add RLS policies to block demo writes on activity_sessions table
CREATE POLICY "Block demo resort session inserts" ON public.activity_sessions
FOR INSERT
WITH CHECK (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort session updates" ON public.activity_sessions
FOR UPDATE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort session deletes" ON public.activity_sessions
FOR DELETE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

-- Add RLS policies to block demo writes on restaurants table
CREATE POLICY "Block demo resort restaurant inserts" ON public.restaurants
FOR INSERT
WITH CHECK (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort restaurant updates" ON public.restaurants
FOR UPDATE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort restaurant deletes" ON public.restaurants
FOR DELETE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

-- Add RLS policies to block demo writes on restaurant_time_slots table
CREATE POLICY "Block demo resort slot inserts" ON public.restaurant_time_slots
FOR INSERT
WITH CHECK (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort slot updates" ON public.restaurant_time_slots
FOR UPDATE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort slot deletes" ON public.restaurant_time_slots
FOR DELETE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

-- Add RLS policies to block demo writes on guests table
CREATE POLICY "Block demo resort guest inserts" ON public.guests
FOR INSERT
WITH CHECK (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort guest updates" ON public.guests
FOR UPDATE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);

CREATE POLICY "Block demo resort guest deletes" ON public.guests
FOR DELETE
USING (
  NOT (
    EXISTS (SELECT 1 FROM public.resorts r WHERE r.id = resort_id AND r.is_demo = true)
    AND public.is_demo_write_blocked()
  )
);