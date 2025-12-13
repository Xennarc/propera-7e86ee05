-- Create resort directory table for storing outlet phone numbers
CREATE TABLE public.resort_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resort_directory ENABLE ROW LEVEL SECURITY;

-- Staff can view directory entries in their resort
CREATE POLICY "Staff can view directory in their resort"
ON public.resort_directory
FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

-- Staff can manage directory entries
CREATE POLICY "Resort admins can manage directory"
ON public.resort_directory
FOR ALL
USING (is_super_admin(auth.uid()) OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role, 'MANAGER'::resort_role]));

-- Guests can view active directory entries (public for guest portal)
CREATE POLICY "Anyone can view active directory entries"
ON public.resort_directory
FOR SELECT
USING (is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_resort_directory_updated_at
BEFORE UPDATE ON public.resort_directory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();