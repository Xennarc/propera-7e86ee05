-- Create session templates table for reusable session configurations
CREATE TABLE public.activity_session_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  capacity integer NOT NULL DEFAULT 10,
  resource_id uuid REFERENCES public.resources(id) ON DELETE SET NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_session_templates ENABLE ROW LEVEL SECURITY;

-- Staff can view templates in their resort
CREATE POLICY "Staff can view session templates in their resort"
ON public.activity_session_templates
FOR SELECT
USING (has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid()));

-- Staff can manage templates
CREATE POLICY "Staff can manage session templates"
ON public.activity_session_templates
FOR INSERT
WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can update session templates"
ON public.activity_session_templates
FOR UPDATE
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can delete session templates"
ON public.activity_session_templates
FOR DELETE
USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));