-- Create activity_closures table
CREATE TABLE public.activity_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  closure_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, closure_date)
);

-- Create restaurant_closures table
CREATE TABLE public.restaurant_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  closure_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, closure_date)
);

-- Enable RLS
ALTER TABLE public.activity_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_closures ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_closures
CREATE POLICY "Staff can view activity closures" ON public.activity_closures
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage activity closures" ON public.activity_closures
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can update activity closures" ON public.activity_closures
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can delete activity closures" ON public.activity_closures
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

-- RLS policies for restaurant_closures
CREATE POLICY "Staff can view restaurant closures" ON public.restaurant_closures
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage restaurant closures" ON public.restaurant_closures
  FOR INSERT WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'FNB'::app_role]));

CREATE POLICY "Staff can update restaurant closures" ON public.restaurant_closures
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'FNB'::app_role]));

CREATE POLICY "Staff can delete restaurant closures" ON public.restaurant_closures
  FOR DELETE USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'FNB'::app_role]));

-- Triggers for updated_at
CREATE TRIGGER update_activity_closures_updated_at
  BEFORE UPDATE ON public.activity_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_closures_updated_at
  BEFORE UPDATE ON public.restaurant_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();