-- Create guest_preferences table for structured preference storage
CREATE TABLE public.guest_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('room', 'dining', 'activity', 'general')),
  value text NOT NULL,
  priority integer NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 3),
  source text NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'prearrival', 'system')),
  created_by_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate preferences per guest
ALTER TABLE public.guest_preferences 
  ADD CONSTRAINT unique_guest_preference UNIQUE (guest_id, category, value);

-- Indexes for efficient lookups
CREATE INDEX idx_guest_preferences_guest ON public.guest_preferences(resort_id, guest_id);
CREATE INDEX idx_guest_preferences_category ON public.guest_preferences(category);

-- Enable RLS
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_preferences FORCE ROW LEVEL SECURITY;

-- Immutable resort_id trigger (using existing function)
CREATE TRIGGER prevent_resort_id_change_guest_preferences
  BEFORE UPDATE ON public.guest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_resort_id_change();

-- Updated_at trigger (using existing function)
CREATE TRIGGER update_guest_preferences_updated_at
  BEFORE UPDATE ON public.guest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies: Staff read access
CREATE POLICY "staff_select_preferences" ON public.guest_preferences
  FOR SELECT
  USING (public.staff_has_resort_access(auth.uid(), resort_id));

-- RLS Policies: Staff write access (specific roles only)
CREATE POLICY "staff_insert_preferences" ON public.guest_preferences
  FOR INSERT
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_update_preferences" ON public.guest_preferences
  FOR UPDATE
  USING (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]))
  WITH CHECK (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));

CREATE POLICY "staff_delete_preferences" ON public.guest_preferences
  FOR DELETE
  USING (public.has_resort_role(auth.uid(), resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]));