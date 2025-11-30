// Application types for Propera

export type AppRole = 'ADMIN' | 'MANAGER' | 'FRONT_OFFICE' | 'ACTIVITIES' | 'FNB';
export type GlobalRole = 'SUPER_ADMIN' | 'STANDARD';
export type ResortRole = 'RESORT_ADMIN' | 'MANAGER' | 'FRONT_OFFICE' | 'ACTIVITIES' | 'FNB';
export type ActivityCategory = 'DIVE' | 'EXCURSION' | 'WATERSPORT' | 'SPA' | 'OTHER';
export type SessionStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
export type BookingSource = 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
export type MealPeriod = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'EVENT';
export type SlotStatus = 'OPEN' | 'CLOSED' | 'FULL';
export type ResourceType = 'BOAT' | 'VAN' | 'CABANA' | 'OTHER';
export type ResortStatus = 'ACTIVE' | 'INACTIVE' | 'DEMO';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface Resort {
  id: string;
  name: string;
  code: string;
  status: ResortStatus;
  timezone: string;
  currency: string;
  login_logo_url: string | null;
  login_hero_image_url: string | null;
  login_primary_color: string | null;
  login_accent_color: string | null;
  guest_login_title: string | null;
  guest_login_subtitle: string | null;
  guest_login_instructions: string | null;
  onboarding_status: OnboardingStatus;
  onboarding_basics_done: boolean;
  onboarding_activities_done: boolean;
  onboarding_restaurants_done: boolean;
  onboarding_staff_done: boolean;
  onboarding_portal_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  email: string;
  name: string | null;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  invited_by_user_id: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  resort?: Resort;
}

export interface Profile {
  id: string;
  full_name: string | null;
  department: string | null;
  resort_id: string | null;
  global_role: GlobalRole;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ResortMembership {
  id: string;
  user_id: string;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  resort?: Resort;
  profile?: Profile;
}

export interface Guest {
  id: string;
  resort_id: string;
  full_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  booking_reference: string | null;
  channel: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DifficultyLevel = 'EASY' | 'MODERATE' | 'ADVANCED';

export interface ActivityFaq {
  question: string;
  answer: string;
}

export interface Activity {
  id: string;
  resort_id: string;
  name: string;
  category: ActivityCategory;
  description: string | null;
  default_price_per_person: number;
  duration_minutes: number;
  default_max_capacity: number;
  min_capacity: number | null;
  age_min: number | null;
  guest_can_book: boolean;
  requires_approval: boolean;
  guest_cutoff_hours: number;
  max_pax_per_booking: number;
  guest_can_cancel: boolean;
  guest_cancel_cutoff_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New content fields
  short_description?: string | null;
  full_description?: string | null;
  difficulty_level?: DifficultyLevel | null;
  max_age?: number | null;
  is_swimming_required?: boolean;
  suitable_for_non_swimmers?: boolean;
  highlights?: unknown;
  includes?: string | null;
  health_and_safety_notes?: string | null;
  cancellation_policy_text?: string | null;
  faq?: unknown;
}

export interface Resource {
  id: string;
  resort_id: string;
  type: ResourceType;
  name: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivitySession {
  id: string;
  resort_id: string;
  activity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  resource_id: string | null;
  lead_staff_id: string | null;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  activity?: Activity;
  resource?: Resource;
  lead_staff?: Profile;
}

export interface ActivityBooking {
  id: string;
  resort_id: string;
  session_id: string;
  guest_id: string;
  room_number: string;
  status: BookingStatus;
  source: BookingSource;
  num_adults: number;
  num_children: number;
  price_per_person: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest?: Guest;
  session?: ActivitySession & { activity?: Activity };
}

export interface Restaurant {
  id: string;
  resort_id: string;
  name: string;
  description: string | null;
  total_capacity: number;
  guest_can_book: boolean;
  requires_approval: boolean;
  guest_cutoff_minutes: number;
  max_pax_per_booking: number;
  guest_can_cancel: boolean;
  guest_cancel_cutoff_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RestaurantTimeSlot {
  id: string;
  resort_id: string;
  restaurant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  meal_period: MealPeriod;
  capacity: number;
  status: SlotStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  restaurant?: Restaurant;
}

export interface RestaurantReservation {
  id: string;
  resort_id: string;
  restaurant_slot_id: string;
  guest_id: string;
  room_number: string;
  status: BookingStatus;
  source: BookingSource;
  num_adults: number;
  num_children: number;
  special_requests: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest?: Guest;
  slot?: RestaurantTimeSlot & { restaurant?: Restaurant };
}
