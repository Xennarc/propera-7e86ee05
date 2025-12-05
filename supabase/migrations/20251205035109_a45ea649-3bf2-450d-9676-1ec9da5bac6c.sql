-- Create enum for frequency
CREATE TYPE public.recurrence_frequency AS ENUM ('DAILY', 'WEEKLY');

-- Activity recurring rules table
CREATE TABLE public.activity_recurring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency recurrence_frequency NOT NULL DEFAULT 'WEEKLY',
  days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0], -- 0=Sun, 1=Mon, etc.
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Restaurant recurring rules table
CREATE TABLE public.restaurant_recurring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency recurrence_frequency NOT NULL DEFAULT 'DAILY',
  days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0],
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  meal_period public.meal_period NOT NULL DEFAULT 'DINNER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.activity_recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_recurring_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_recurring_rules
CREATE POLICY "Staff can view activity recurring rules"
  ON public.activity_recurring_rules FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage activity recurring rules"
  ON public.activity_recurring_rules FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Staff can update activity recurring rules"
  ON public.activity_recurring_rules FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'ACTIVITIES'::app_role]));

CREATE POLICY "Admin can delete activity recurring rules"
  ON public.activity_recurring_rules FOR DELETE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- RLS policies for restaurant_recurring_rules
CREATE POLICY "Staff can view restaurant recurring rules"
  ON public.restaurant_recurring_rules FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage restaurant recurring rules"
  ON public.restaurant_recurring_rules FOR INSERT
  WITH CHECK (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'FNB'::app_role]));

CREATE POLICY "Staff can update restaurant recurring rules"
  ON public.restaurant_recurring_rules FOR UPDATE
  USING (has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'FRONT_OFFICE'::app_role, 'FNB'::app_role]));

CREATE POLICY "Admin can delete restaurant recurring rules"
  ON public.restaurant_recurring_rules FOR DELETE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_activity_recurring_rules_updated_at
  BEFORE UPDATE ON public.activity_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_recurring_rules_updated_at
  BEFORE UPDATE ON public.restaurant_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries
CREATE INDEX idx_activity_recurring_rules_activity ON public.activity_recurring_rules(activity_id);
CREATE INDEX idx_activity_recurring_rules_resort ON public.activity_recurring_rules(resort_id);
CREATE INDEX idx_restaurant_recurring_rules_restaurant ON public.restaurant_recurring_rules(restaurant_id);
CREATE INDEX idx_restaurant_recurring_rules_resort ON public.restaurant_recurring_rules(resort_id);