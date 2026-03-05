// Application types for Propera

export type GlobalRole = 'SUPER_ADMIN' | 'STANDARD';
export type ResortRole = 'RESORT_ADMIN' | 'MANAGER' | 'FRONT_OFFICE' | 'ACTIVITIES' | 'FNB' | 'RESERVATIONS' | 'TRANSPORT';
export type ActivityCategory = 'DIVE' | 'EXCURSION' | 'WATERSPORT' | 'SPA' | 'OTHER';
export type SessionStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'CHECK_IN' | 'DEPARTED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
export type BookingSource = 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
export type MealPeriod = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'EVENT';
export type SlotStatus = 'OPEN' | 'CLOSED' | 'FULL';
export type ResourceType = 'BOAT' | 'VAN' | 'CABANA' | 'OTHER';
export type ResortStatus = 'ACTIVE' | 'INACTIVE' | 'DEMO';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type SubscriptionTier = 'ESSENTIAL' | 'PROFESSIONAL' | 'ELITE';

// Transport/Buggy module types
export type BuggyStatus = 'available' | 'en_route' | 'out_of_service' | 'charging';
export type DriverStatus = 'offline' | 'online' | 'on_trip' | 'break';
export type BuggyRequestSource = 'guest' | 'staff';
export type BuggyRequestType = 'on_demand' | 'scheduled' | 'fixed_route';
export type BuggyRequestStatus = 'requested' | 'queued' | 'assigned_to_trip' | 'driver_en_route' | 'arrived' | 'picked_up' | 'completed' | 'cancelled' | 'failed' | 'no_show';
export type BuggyPriority = 'normal' | 'high' | 'vip';
export type BuggyTripStatus = 'planning' | 'assigned' | 'en_route' | 'active' | 'completed' | 'cancelled';
export type BuggyTripType = 'pooled_custom' | 'scheduled_pool' | 'fixed_route_run';
export type BuggyTripRequestState = 'queued' | 'picked_up' | 'dropped_off' | 'cancelled' | 'no_show';
export type BuggyTripStopKind = 'pickup' | 'dropoff' | 'waypoint';
export type BuggyTripStopStatus = 'pending' | 'arrived' | 'completed' | 'skipped';

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
  onboarding_branding_done: boolean;
  onboarding_prearrival_done: boolean;
  onboarding_portal_done: boolean;
  is_demo: boolean;
  demo_expires_at: string | null;
  demo_note: string | null;
  subscription_tier: SubscriptionTier;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  invited_by_user_id: string | null;
  invited_by_name: string | null;
  invite_message: string | null;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  resort?: Resort;
}

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  department: string | null;
  resort_id: string | null;
  global_role: GlobalRole;
  created_at: string;
  updated_at: string;
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
  loyalty_tier: string | null;
  is_vip: boolean;
  notes_internal: string | null;
  portal_enabled?: boolean;
  portal_pin_hash?: string | null;
  portal_pin_last4?: string | null;
  portal_pin_set_at?: string | null;
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
  icon_key: string | null;
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
  image_url?: string | null;
  requirements_json?: unknown;
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

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY';

export interface ActivityRecurringRule {
  id: string;
  resort_id: string;
  activity_id: string;
  start_date: string;
  end_date: string;
  frequency: RecurrenceFrequency;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  activity?: Activity;
}

export interface RestaurantRecurringRule {
  id: string;
  resort_id: string;
  restaurant_id: string;
  start_date: string;
  end_date: string;
  frequency: RecurrenceFrequency;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  capacity: number;
  meal_period: MealPeriod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  restaurant?: Restaurant;
}

export interface ActivityClosure {
  id: string;
  resort_id: string;
  activity_id: string;
  closure_date: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  activity?: Activity;
}

export interface RestaurantClosure {
  id: string;
  resort_id: string;
  restaurant_id: string;
  closure_date: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  restaurant?: Restaurant;
}

// ============================================================================
// Department Module Types
// ============================================================================

export type DeptRole = 'LINE' | 'SUPERVISOR' | 'MANAGER' | 'staff' | 'manager';

export type DepartmentModuleKey =
  | 'ops_planner'
  | 'master_ops_sheet'
  | 'ops_inbox'
  | 'session_run_sheet'
  | 'resources_assets'
  | 'resources_shifts'
  | 'resources_unavailability'
  | 'pickup_runs'
  | 'compliance_verify'
  | 'compliance_medical';

export interface ResortDepartment {
  id: string;
  resort_id: string;
  key: string;
  name: string;
  is_active: boolean;
  activity_scope_key: string | null;
  scope_type: string;
  created_at: string;
}

export interface DepartmentMembership {
  id: string;
  resort_id: string;
  department_id: string | null;
  department_key: string;
  user_id: string;
  dept_role: DeptRole;
  is_active: boolean;
  created_at: string;
  // Joined fields
  department?: ResortDepartment;
  profile?: Profile;
}

export interface DepartmentModuleAccess {
  id: string;
  resort_id: string;
  department_id: string;
  user_id: string;
  module_key: DepartmentModuleKey;
  enabled: boolean;
  updated_at: string;
}

export type DepartmentBindingType = 'activity_category' | 'restaurant';

export interface DepartmentBinding {
  id: string;
  resort_id: string;
  department_id: string;
  binding_type: DepartmentBindingType;
  binding_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Transport/Buggy Module Types
// ============================================================================

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Buggy {
  id: string;
  resort_id: string;
  name: string;
  capacity: number;
  is_accessible: boolean;
  status: BuggyStatus;
  current_stop_id: string | null;
  last_location: GeoLocation | null;
  last_location_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  current_stop?: BuggyStop;
}

export interface BuggyDriver {
  id: string;
  resort_id: string;
  user_id: string;
  status: DriverStatus;
  assigned_buggy_id: string | null;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_buggy?: Buggy;
  profile?: Profile;
}

export interface BuggyStop {
  id: string;
  resort_id: string;
  name: string;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BuggyRoute {
  id: string;
  resort_id: string;
  name: string;
  is_active: boolean;
  color_tag: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  stops?: BuggyRouteStop[];
}

export interface BuggyRouteStop {
  id: string;
  resort_id: string;
  route_id: string;
  stop_id: string;
  sort_order: number;
  dwell_minutes: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  stop?: BuggyStop;
}

export interface BuggyRouteSchedule {
  id: string;
  resort_id: string;
  route_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  interval_minutes: number | null;
  departure_times: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  route?: BuggyRoute;
}

export interface BuggyRequest {
  id: string;
  resort_id: string;
  guest_id: string | null;
  created_by_staff_user_id: string | null;
  request_source: BuggyRequestSource;
  request_type: BuggyRequestType;
  party_size: number;
  needs_accessible: boolean;
  pickup_stop_id: string | null;
  pickup_text: string | null;
  pickup_location: GeoLocation | null;
  dropoff_stop_id: string | null;
  dropoff_text: string | null;
  dropoff_location: GeoLocation | null;
  scheduled_for: string | null;
  route_id: string | null;
  priority: BuggyPriority;
  status: BuggyRequestStatus;
  status_reason: string | null;
  eta_minutes: number | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  guest?: Guest;
  pickup_stop?: BuggyStop;
  dropoff_stop?: BuggyStop;
  route?: BuggyRoute;
}

export interface BuggyTrip {
  id: string;
  resort_id: string;
  trip_type: BuggyTripType;
  status: BuggyTripStatus;
  buggy_id: string | null;
  driver_user_id: string | null;
  capacity_total: number | null;
  start_at: string | null;
  end_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  buggy?: Buggy;
  driver?: BuggyDriver;
  requests?: BuggyTripRequest[];
  stops?: BuggyTripStop[];
}

export interface BuggyTripRequest {
  id: string;
  resort_id: string;
  trip_id: string;
  request_id: string;
  party_size: number;
  state: BuggyTripRequestState;
  created_at: string;
  updated_at: string;
  // Joined fields
  request?: BuggyRequest;
}

export interface BuggyTripStop {
  id: string;
  resort_id: string;
  trip_id: string;
  stop_kind: BuggyTripStopKind;
  stop_id: string | null;
  title: string | null;
  location: GeoLocation | null;
  sequence: number;
  related_request_id: string | null;
  status: BuggyTripStopStatus;
  arrived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  stop?: BuggyStop;
  related_request?: BuggyRequest;
}
