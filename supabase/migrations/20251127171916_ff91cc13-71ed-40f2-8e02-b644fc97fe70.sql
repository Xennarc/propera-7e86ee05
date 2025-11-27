-- Create enums for the application
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES', 'FNB');
CREATE TYPE public.activity_category AS ENUM ('DIVE', 'EXCURSION', 'WATERSPORT', 'SPA', 'OTHER');
CREATE TYPE public.session_status AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');
CREATE TYPE public.booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');
CREATE TYPE public.booking_source AS ENUM ('STAFF_FRONT_DESK', 'STAFF_DIVE', 'STAFF_FNB', 'GUEST_PORTAL');
CREATE TYPE public.meal_period AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'EVENT');
CREATE TYPE public.slot_status AS ENUM ('OPEN', 'CLOSED', 'FULL');
CREATE TYPE public.resource_type AS ENUM ('BOAT', 'VAN', 'CABANA', 'OTHER');

-- 1. Resorts table
CREATE TABLE public.resorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  department TEXT,
  resort_id UUID REFERENCES public.resorts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Guests table
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nationality TEXT,
  email TEXT,
  phone TEXT,
  booking_reference TEXT,
  channel TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category activity_category NOT NULL DEFAULT 'OTHER',
  description TEXT,
  default_price_per_person NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  default_max_capacity INTEGER NOT NULL DEFAULT 10,
  min_capacity INTEGER,
  age_min INTEGER,
  guest_can_book BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  guest_cutoff_hours INTEGER NOT NULL DEFAULT 2,
  max_pax_per_booking INTEGER NOT NULL DEFAULT 4,
  guest_can_cancel BOOLEAN NOT NULL DEFAULT true,
  guest_cancel_cutoff_hours INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  type resource_type NOT NULL DEFAULT 'OTHER',
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Activity sessions table
CREATE TABLE public.activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 10,
  resource_id UUID REFERENCES public.resources(id),
  lead_staff_id UUID REFERENCES auth.users(id),
  status session_status NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Activity bookings table
CREATE TABLE public.activity_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.activity_sessions(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'PENDING',
  source booking_source NOT NULL DEFAULT 'STAFF_FRONT_DESK',
  num_adults INTEGER NOT NULL DEFAULT 1,
  num_children INTEGER NOT NULL DEFAULT 0,
  price_per_person NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_capacity INTEGER NOT NULL DEFAULT 50,
  guest_can_book BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  guest_cutoff_minutes INTEGER NOT NULL DEFAULT 30,
  max_pax_per_booking INTEGER NOT NULL DEFAULT 6,
  guest_can_cancel BOOLEAN NOT NULL DEFAULT true,
  guest_cancel_cutoff_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Restaurant time slots table
CREATE TABLE public.restaurant_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  meal_period meal_period NOT NULL DEFAULT 'DINNER',
  capacity INTEGER NOT NULL DEFAULT 50,
  status slot_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Restaurant reservations table
CREATE TABLE public.restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  restaurant_slot_id UUID NOT NULL REFERENCES public.restaurant_time_slots(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  status booking_status NOT NULL DEFAULT 'PENDING',
  source booking_source NOT NULL DEFAULT 'STAFF_FRONT_DESK',
  num_adults INTEGER NOT NULL DEFAULT 1,
  num_children INTEGER NOT NULL DEFAULT 0,
  special_requests TEXT,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- RLS Policies for resorts (all authenticated can read, admin can write)
CREATE POLICY "Authenticated users can view resorts" ON public.resorts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert resorts" ON public.resorts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can update resorts" ON public.resorts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "Admins can delete resorts" ON public.resorts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for guests (ADMIN, MANAGER read-only, FRONT_OFFICE full, ACTIVITIES/FNB view)
CREATE POLICY "Staff can view guests" ON public.guests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Front office and admin can manage guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE']::app_role[]));
CREATE POLICY "Front office and admin can update guests" ON public.guests FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE']::app_role[]));
CREATE POLICY "Front office and admin can delete guests" ON public.guests FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE']::app_role[]));

-- RLS Policies for activities
CREATE POLICY "Staff can view activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Staff can update activities" ON public.activities FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Admin can delete activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for resources
CREATE POLICY "Staff can view resources" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage resources" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for activity_sessions
CREATE POLICY "Staff can view sessions" ON public.activity_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage sessions" ON public.activity_sessions FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Staff can update sessions" ON public.activity_sessions FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Admin can delete sessions" ON public.activity_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for activity_bookings
CREATE POLICY "Staff can view bookings" ON public.activity_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage bookings" ON public.activity_bookings FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Staff can update bookings" ON public.activity_bookings FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']::app_role[]));
CREATE POLICY "Admin can delete bookings" ON public.activity_bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for restaurants
CREATE POLICY "Staff can view restaurants" ON public.restaurants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage restaurants" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Staff can update restaurants" ON public.restaurants FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Admin can delete restaurants" ON public.restaurants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for restaurant_time_slots
CREATE POLICY "Staff can view slots" ON public.restaurant_time_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage slots" ON public.restaurant_time_slots FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Staff can update slots" ON public.restaurant_time_slots FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Admin can delete slots" ON public.restaurant_time_slots FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for restaurant_reservations
CREATE POLICY "Staff can view reservations" ON public.restaurant_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage reservations" ON public.restaurant_reservations FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Staff can update reservations" ON public.restaurant_reservations FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['ADMIN', 'FRONT_OFFICE', 'FNB']::app_role[]));
CREATE POLICY "Admin can delete reservations" ON public.restaurant_reservations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_resorts_updated_at BEFORE UPDATE ON public.resorts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activity_sessions_updated_at BEFORE UPDATE ON public.activity_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activity_bookings_updated_at BEFORE UPDATE ON public.activity_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_time_slots_updated_at BEFORE UPDATE ON public.restaurant_time_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurant_reservations_updated_at BEFORE UPDATE ON public.restaurant_reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();