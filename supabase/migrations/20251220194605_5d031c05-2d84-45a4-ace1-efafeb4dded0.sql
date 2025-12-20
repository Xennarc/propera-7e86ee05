-- =============================================================
-- RBAC SYSTEM: Permissions, Roles, Overrides, and Audit Logging
-- =============================================================

-- 1) PERMISSION EFFECT ENUM
CREATE TYPE public.permission_effect AS ENUM ('grant', 'revoke');

-- 2) PERMISSIONS TABLE - Catalog of all available permissions
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_dangerous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) ROLES TABLE - Custom roles (nullable resort_id for global templates)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (resort_id, name)
);

-- 4) ROLE_PERMISSIONS TABLE - Maps roles to permissions
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_key)
);

-- 5) USER_RESORT_ROLES TABLE - Assigns roles to users per resort
CREATE TABLE public.user_resort_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, resort_id, role_id)
);

-- 6) USER_PERMISSION_OVERRIDES TABLE - Per-user permission grants/revokes
CREATE TABLE public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id UUID NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  effect public.permission_effect NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, resort_id, permission_key)
);

-- 7) ACCESS_AUDIT_LOG TABLE - Tracks all access-related changes
CREATE TABLE public.access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID REFERENCES public.resorts(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_key TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_permissions_category ON public.permissions(category);
CREATE INDEX idx_roles_resort_id ON public.roles(resort_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_user_resort_roles_user_id ON public.user_resort_roles(user_id);
CREATE INDEX idx_user_resort_roles_resort_id ON public.user_resort_roles(resort_id);
CREATE INDEX idx_user_permission_overrides_user_id ON public.user_permission_overrides(user_id);
CREATE INDEX idx_user_permission_overrides_resort_id ON public.user_permission_overrides(resort_id);
CREATE INDEX idx_access_audit_log_resort_id ON public.access_audit_log(resort_id);
CREATE INDEX idx_access_audit_log_target_user_id ON public.access_audit_log(target_user_id);
CREATE INDEX idx_access_audit_log_created_at ON public.access_audit_log(created_at DESC);

-- =============================================================
-- ENABLE RLS
-- =============================================================
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resort_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- Permissions: Anyone authenticated can read (needed for UI)
CREATE POLICY "Anyone can view permissions" ON public.permissions
  FOR SELECT USING (true);

-- Roles: Users can view roles for resorts they belong to + global templates
CREATE POLICY "Users can view roles in their resorts" ON public.roles
  FOR SELECT USING (
    resort_id IS NULL 
    OR has_resort_membership(auth.uid(), resort_id) 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage roles" ON public.roles
  FOR ALL USING (
    is_super_admin(auth.uid()) 
    OR (resort_id IS NOT NULL AND has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role]))
  );

-- Role Permissions: Users can view for roles they can see
CREATE POLICY "Users can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.id = role_id 
      AND (r.resort_id IS NULL OR has_resort_membership(auth.uid(), r.resort_id) OR is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.roles r 
      WHERE r.id = role_id 
      AND (is_super_admin(auth.uid()) OR (r.resort_id IS NOT NULL AND has_resort_role(auth.uid(), r.resort_id, ARRAY['RESORT_ADMIN'::resort_role])))
    )
  );

-- User Resort Roles: Users can view for their resorts
CREATE POLICY "Users can view user roles in their resorts" ON public.user_resort_roles
  FOR SELECT USING (
    has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage user roles" ON public.user_resort_roles
  FOR ALL USING (
    is_super_admin(auth.uid()) 
    OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

-- User Permission Overrides: Users can view for their resorts
CREATE POLICY "Users can view overrides in their resorts" ON public.user_permission_overrides
  FOR SELECT USING (
    has_resort_membership(auth.uid(), resort_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage overrides" ON public.user_permission_overrides
  FOR ALL USING (
    is_super_admin(auth.uid()) 
    OR has_resort_role(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
  );

-- Access Audit Log: Users can view for their resorts
CREATE POLICY "Users can view audit logs in their resorts" ON public.access_audit_log
  FOR SELECT USING (
    resort_id IS NULL 
    OR has_resort_membership(auth.uid(), resort_id) 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert audit logs" ON public.access_audit_log
  FOR INSERT WITH CHECK (true);

-- =============================================================
-- SEED PERMISSIONS CATALOG
-- =============================================================
INSERT INTO public.permissions (key, label, description, category, is_dangerous) VALUES
-- Identity & Access
('access.users.view', 'View Users', 'View staff users in the resort', 'Identity & Access', false),
('access.users.invite', 'Invite Staff', 'Invite new staff members', 'Identity & Access', false),
('access.users.edit', 'Edit Users', 'Edit user details and profile', 'Identity & Access', false),
('access.users.remove', 'Remove Users', 'Remove staff from the resort', 'Identity & Access', true),
('access.users.reset_password', 'Reset Passwords', 'Reset user passwords', 'Identity & Access', true),
('access.roles.view', 'View Roles', 'View available roles', 'Identity & Access', false),
('access.roles.manage', 'Manage Roles', 'Create, edit, and delete roles', 'Identity & Access', true),
('access.permissions.view', 'View Permissions', 'View user permissions', 'Identity & Access', false),
('access.permissions.manage', 'Manage Permissions', 'Grant or revoke user permissions', 'Identity & Access', true),
('access.users.assign_superadmin', 'Assign Super Admin', 'Grant SUPER_ADMIN role', 'Danger Zone', true),

-- Resort Settings & Branding
('settings.resort.view', 'View Resort Settings', 'View resort configuration', 'Resort Settings', false),
('settings.resort.edit', 'Edit Resort Settings', 'Modify resort settings', 'Resort Settings', false),
('settings.branding.edit', 'Edit Branding', 'Customize resort branding', 'Resort Settings', false),
('settings.pricing.view', 'View Pricing', 'View pricing configuration', 'Resort Settings', false),
('settings.pricing.edit', 'Edit Pricing', 'Modify pricing settings', 'Resort Settings', false),
('settings.directory.manage', 'Manage Directory', 'Edit resort directory entries', 'Resort Settings', false),
('settings.prearrival.manage', 'Manage Pre-arrival Settings', 'Configure pre-arrival workflow', 'Resort Settings', false),
('settings.public_links.manage', 'Manage Public Links', 'Create and manage public booking links', 'Resort Settings', false),

-- Guests & Stays
('guests.view', 'View Guests', 'View guest records', 'Guests & Stays', false),
('guests.create', 'Create Guests', 'Add new guest records', 'Guests & Stays', false),
('guests.edit', 'Edit Guests', 'Modify guest information', 'Guests & Stays', false),
('guests.delete', 'Delete Guests', 'Remove guest records', 'Guests & Stays', true),
('guests.import', 'Import Guests', 'Bulk import guests via CSV', 'Guests & Stays', false),
('guests.pin.manage', 'Manage Guest PINs', 'Generate and reset portal PINs', 'Guests & Stays', false),
('guests.notes.edit', 'Edit Guest Notes', 'Add internal notes to guest profiles', 'Guests & Stays', false),
('guests.travel_party.manage', 'Manage Travel Party', 'Edit guest travel parties', 'Guests & Stays', false),

-- Pre-arrival
('prearrival.view', 'View Pre-arrival Data', 'View pre-arrival submissions', 'Pre-arrival', false),
('prearrival.links.create', 'Create Pre-arrival Links', 'Generate pre-arrival links', 'Pre-arrival', false),
('prearrival.links.revoke', 'Revoke Pre-arrival Links', 'Revoke active links', 'Pre-arrival', false),
('prearrival.review', 'Review Pre-arrival', 'Mark pre-arrival as reviewed', 'Pre-arrival', false),
('prearrival.email.send', 'Send Pre-arrival Emails', 'Send pre-arrival invitation emails', 'Pre-arrival', false),

-- Activities & Sessions
('activities.view', 'View Activities', 'View activity catalog', 'Activities', false),
('activities.create', 'Create Activities', 'Add new activities', 'Activities', false),
('activities.edit', 'Edit Activities', 'Modify activity details', 'Activities', false),
('activities.delete', 'Delete Activities', 'Remove activities', 'Activities', true),
('sessions.view', 'View Sessions', 'View activity sessions', 'Activities', false),
('sessions.create', 'Create Sessions', 'Schedule new sessions', 'Activities', false),
('sessions.edit', 'Edit Sessions', 'Modify session details', 'Activities', false),
('sessions.cancel', 'Cancel Sessions', 'Cancel scheduled sessions', 'Activities', false),
('bookings.activity.view', 'View Activity Bookings', 'View booking records', 'Activities', false),
('bookings.activity.create', 'Create Activity Bookings', 'Book guests for activities', 'Activities', false),
('bookings.activity.edit', 'Edit Activity Bookings', 'Modify booking details', 'Activities', false),
('bookings.activity.cancel', 'Cancel Activity Bookings', 'Cancel bookings', 'Activities', false),
('activities.recurring.manage', 'Manage Recurring Schedules', 'Create recurring session rules', 'Activities', false),
('activities.closures.manage', 'Manage Activity Closures', 'Set closure days', 'Activities', false),
('activities.resources.manage', 'Manage Activity Resources', 'Assign resources to sessions', 'Activities', false),
('activities.waitlist.manage', 'Manage Waitlist', 'Promote or remove waitlist entries', 'Activities', false),

-- Dining & Restaurants
('restaurants.view', 'View Restaurants', 'View restaurant catalog', 'Dining', false),
('restaurants.create', 'Create Restaurants', 'Add new restaurants', 'Dining', false),
('restaurants.edit', 'Edit Restaurants', 'Modify restaurant details', 'Dining', false),
('restaurants.delete', 'Delete Restaurants', 'Remove restaurants', 'Dining', true),
('slots.view', 'View Time Slots', 'View restaurant slots', 'Dining', false),
('slots.create', 'Create Time Slots', 'Add dining slots', 'Dining', false),
('slots.edit', 'Edit Time Slots', 'Modify slot details', 'Dining', false),
('slots.cancel', 'Cancel Time Slots', 'Cancel slots', 'Dining', false),
('bookings.restaurant.view', 'View Restaurant Reservations', 'View reservations', 'Dining', false),
('bookings.restaurant.create', 'Create Restaurant Reservations', 'Book guests for dining', 'Dining', false),
('bookings.restaurant.edit', 'Edit Restaurant Reservations', 'Modify reservations', 'Dining', false),
('bookings.restaurant.cancel', 'Cancel Restaurant Reservations', 'Cancel reservations', 'Dining', false),
('restaurants.recurring.manage', 'Manage Recurring Slots', 'Create recurring slot rules', 'Dining', false),
('restaurants.closures.manage', 'Manage Restaurant Closures', 'Set closure days', 'Dining', false),

-- Guest Portal Content
('portal.content.edit', 'Edit Portal Content', 'Customize guest portal text', 'Guest Portal', false),
('portal.branding.edit', 'Edit Portal Branding', 'Customize portal appearance', 'Guest Portal', false),

-- Loyalty (Elite tier)
('loyalty.view', 'View Loyalty Program', 'View loyalty configuration', 'Loyalty', false),
('loyalty.program.manage', 'Manage Loyalty Program', 'Configure program settings', 'Loyalty', false),
('loyalty.tiers.manage', 'Manage Loyalty Tiers', 'Create and edit tiers', 'Loyalty', false),
('loyalty.rewards.manage', 'Manage Loyalty Rewards', 'Create and edit rewards', 'Loyalty', false),
('loyalty.members.view', 'View Loyalty Members', 'View member records', 'Loyalty', false),
('loyalty.members.manage', 'Manage Loyalty Members', 'Adjust points and tiers', 'Loyalty', false),
('loyalty.transactions.view', 'View Loyalty Transactions', 'View point history', 'Loyalty', false),

-- Messaging & Requests
('requests.view', 'View Guest Requests', 'View incoming requests', 'Messaging', false),
('requests.respond', 'Respond to Requests', 'Update request status', 'Messaging', false),
('notifications.send', 'Send Notifications', 'Send guest notifications', 'Messaging', false),

-- Analytics & Reports
('reports.view', 'View Reports', 'Access reports dashboard', 'Reports', false),
('reports.activities', 'View Activities Report', 'Access activities analytics', 'Reports', false),
('reports.restaurants', 'View Restaurants Report', 'Access dining analytics', 'Reports', false),
('reports.guests', 'View Guests Report', 'Access guest analytics', 'Reports', false),
('reports.feedback', 'View Feedback Report', 'Access feedback analytics', 'Reports', false),
('reports.cancellations', 'View Cancellations Report', 'Access cancellation analytics', 'Reports', false),
('reports.sales', 'View Sales Report', 'Access sales performance', 'Reports', false),
('reports.export', 'Export Reports', 'Download report data', 'Reports', false),
('reports.ai_insights', 'View AI Insights', 'Access AI-generated insights', 'Reports', false),

-- Billing (Super Admin only typically)
('billing.view', 'View Billing', 'View subscription and billing', 'Billing', false),
('billing.manage', 'Manage Billing', 'Modify subscription plans', 'Billing', true),

-- Integrations
('integrations.view', 'View Integrations', 'View connected services', 'Integrations', false),
('integrations.manage', 'Manage Integrations', 'Configure integrations', 'Integrations', true),

-- Danger Zone
('system.demo.convert', 'Convert Demo Resort', 'Convert demo to production', 'Danger Zone', true),
('system.resort.delete', 'Delete Resort', 'Permanently delete a resort', 'Danger Zone', true);

-- =============================================================
-- CREATE DEFAULT SYSTEM ROLES (Global templates, resort_id = NULL)
-- =============================================================
INSERT INTO public.roles (id, resort_id, name, description, is_system_role) VALUES
('00000000-0000-0000-0000-000000000001', NULL, 'Resort Administrator', 'Full access to all resort features', true),
('00000000-0000-0000-0000-000000000002', NULL, 'Manager', 'Oversee operations and staff', true),
('00000000-0000-0000-0000-000000000003', NULL, 'Front Office', 'Guest check-in/out and general operations', true),
('00000000-0000-0000-0000-000000000004', NULL, 'Reservations', 'Manage bookings and reservations', true),
('00000000-0000-0000-0000-000000000005', NULL, 'Activities Coordinator', 'Manage activities and sessions', true),
('00000000-0000-0000-0000-000000000006', NULL, 'F&B Staff', 'Manage restaurant reservations', true);

-- =============================================================
-- ASSIGN PERMISSIONS TO DEFAULT ROLES
-- =============================================================

-- Resort Administrator: Almost everything except super admin privileges
INSERT INTO public.role_permissions (role_id, permission_key)
SELECT '00000000-0000-0000-0000-000000000001', key 
FROM public.permissions 
WHERE key NOT IN ('access.users.assign_superadmin', 'system.resort.delete', 'billing.manage');

-- Manager: Operations focused
INSERT INTO public.role_permissions (role_id, permission_key) VALUES
('00000000-0000-0000-0000-000000000002', 'access.users.view'),
('00000000-0000-0000-0000-000000000002', 'access.permissions.view'),
('00000000-0000-0000-0000-000000000002', 'settings.resort.view'),
('00000000-0000-0000-0000-000000000002', 'guests.view'),
('00000000-0000-0000-0000-000000000002', 'guests.create'),
('00000000-0000-0000-0000-000000000002', 'guests.edit'),
('00000000-0000-0000-0000-000000000002', 'guests.notes.edit'),
('00000000-0000-0000-0000-000000000002', 'guests.travel_party.manage'),
('00000000-0000-0000-0000-000000000002', 'prearrival.view'),
('00000000-0000-0000-0000-000000000002', 'prearrival.review'),
('00000000-0000-0000-0000-000000000002', 'activities.view'),
('00000000-0000-0000-0000-000000000002', 'sessions.view'),
('00000000-0000-0000-0000-000000000002', 'bookings.activity.view'),
('00000000-0000-0000-0000-000000000002', 'restaurants.view'),
('00000000-0000-0000-0000-000000000002', 'slots.view'),
('00000000-0000-0000-0000-000000000002', 'bookings.restaurant.view'),
('00000000-0000-0000-0000-000000000002', 'requests.view'),
('00000000-0000-0000-0000-000000000002', 'requests.respond'),
('00000000-0000-0000-0000-000000000002', 'reports.view'),
('00000000-0000-0000-0000-000000000002', 'reports.activities'),
('00000000-0000-0000-0000-000000000002', 'reports.restaurants'),
('00000000-0000-0000-0000-000000000002', 'reports.guests'),
('00000000-0000-0000-0000-000000000002', 'reports.feedback'),
('00000000-0000-0000-0000-000000000002', 'reports.cancellations');

-- Front Office: Guest operations
INSERT INTO public.role_permissions (role_id, permission_key) VALUES
('00000000-0000-0000-0000-000000000003', 'guests.view'),
('00000000-0000-0000-0000-000000000003', 'guests.create'),
('00000000-0000-0000-0000-000000000003', 'guests.edit'),
('00000000-0000-0000-0000-000000000003', 'guests.pin.manage'),
('00000000-0000-0000-0000-000000000003', 'guests.notes.edit'),
('00000000-0000-0000-0000-000000000003', 'guests.travel_party.manage'),
('00000000-0000-0000-0000-000000000003', 'prearrival.view'),
('00000000-0000-0000-0000-000000000003', 'prearrival.links.create'),
('00000000-0000-0000-0000-000000000003', 'prearrival.review'),
('00000000-0000-0000-0000-000000000003', 'prearrival.email.send'),
('00000000-0000-0000-0000-000000000003', 'activities.view'),
('00000000-0000-0000-0000-000000000003', 'sessions.view'),
('00000000-0000-0000-0000-000000000003', 'sessions.create'),
('00000000-0000-0000-0000-000000000003', 'sessions.edit'),
('00000000-0000-0000-0000-000000000003', 'bookings.activity.view'),
('00000000-0000-0000-0000-000000000003', 'bookings.activity.create'),
('00000000-0000-0000-0000-000000000003', 'bookings.activity.edit'),
('00000000-0000-0000-0000-000000000003', 'bookings.activity.cancel'),
('00000000-0000-0000-0000-000000000003', 'restaurants.view'),
('00000000-0000-0000-0000-000000000003', 'slots.view'),
('00000000-0000-0000-0000-000000000003', 'slots.create'),
('00000000-0000-0000-0000-000000000003', 'slots.edit'),
('00000000-0000-0000-0000-000000000003', 'bookings.restaurant.view'),
('00000000-0000-0000-0000-000000000003', 'bookings.restaurant.create'),
('00000000-0000-0000-0000-000000000003', 'bookings.restaurant.edit'),
('00000000-0000-0000-0000-000000000003', 'bookings.restaurant.cancel'),
('00000000-0000-0000-0000-000000000003', 'requests.view'),
('00000000-0000-0000-0000-000000000003', 'requests.respond'),
('00000000-0000-0000-0000-000000000003', 'reports.view');

-- Reservations: Booking focused
INSERT INTO public.role_permissions (role_id, permission_key) VALUES
('00000000-0000-0000-0000-000000000004', 'guests.view'),
('00000000-0000-0000-0000-000000000004', 'guests.create'),
('00000000-0000-0000-0000-000000000004', 'guests.edit'),
('00000000-0000-0000-0000-000000000004', 'prearrival.view'),
('00000000-0000-0000-0000-000000000004', 'activities.view'),
('00000000-0000-0000-0000-000000000004', 'sessions.view'),
('00000000-0000-0000-0000-000000000004', 'bookings.activity.view'),
('00000000-0000-0000-0000-000000000004', 'bookings.activity.create'),
('00000000-0000-0000-0000-000000000004', 'bookings.activity.edit'),
('00000000-0000-0000-0000-000000000004', 'restaurants.view'),
('00000000-0000-0000-0000-000000000004', 'slots.view'),
('00000000-0000-0000-0000-000000000004', 'bookings.restaurant.view'),
('00000000-0000-0000-0000-000000000004', 'bookings.restaurant.create'),
('00000000-0000-0000-0000-000000000004', 'bookings.restaurant.edit'),
('00000000-0000-0000-0000-000000000004', 'requests.view'),
('00000000-0000-0000-0000-000000000004', 'reports.view');

-- Activities Coordinator
INSERT INTO public.role_permissions (role_id, permission_key) VALUES
('00000000-0000-0000-0000-000000000005', 'guests.view'),
('00000000-0000-0000-0000-000000000005', 'activities.view'),
('00000000-0000-0000-0000-000000000005', 'activities.create'),
('00000000-0000-0000-0000-000000000005', 'activities.edit'),
('00000000-0000-0000-0000-000000000005', 'sessions.view'),
('00000000-0000-0000-0000-000000000005', 'sessions.create'),
('00000000-0000-0000-0000-000000000005', 'sessions.edit'),
('00000000-0000-0000-0000-000000000005', 'sessions.cancel'),
('00000000-0000-0000-0000-000000000005', 'bookings.activity.view'),
('00000000-0000-0000-0000-000000000005', 'bookings.activity.create'),
('00000000-0000-0000-0000-000000000005', 'bookings.activity.edit'),
('00000000-0000-0000-0000-000000000005', 'bookings.activity.cancel'),
('00000000-0000-0000-0000-000000000005', 'activities.recurring.manage'),
('00000000-0000-0000-0000-000000000005', 'activities.closures.manage'),
('00000000-0000-0000-0000-000000000005', 'activities.resources.manage'),
('00000000-0000-0000-0000-000000000005', 'activities.waitlist.manage'),
('00000000-0000-0000-0000-000000000005', 'requests.view'),
('00000000-0000-0000-0000-000000000005', 'reports.view'),
('00000000-0000-0000-0000-000000000005', 'reports.activities');

-- F&B Staff
INSERT INTO public.role_permissions (role_id, permission_key) VALUES
('00000000-0000-0000-0000-000000000006', 'guests.view'),
('00000000-0000-0000-0000-000000000006', 'restaurants.view'),
('00000000-0000-0000-0000-000000000006', 'restaurants.create'),
('00000000-0000-0000-0000-000000000006', 'restaurants.edit'),
('00000000-0000-0000-0000-000000000006', 'slots.view'),
('00000000-0000-0000-0000-000000000006', 'slots.create'),
('00000000-0000-0000-0000-000000000006', 'slots.edit'),
('00000000-0000-0000-0000-000000000006', 'slots.cancel'),
('00000000-0000-0000-0000-000000000006', 'bookings.restaurant.view'),
('00000000-0000-0000-0000-000000000006', 'bookings.restaurant.create'),
('00000000-0000-0000-0000-000000000006', 'bookings.restaurant.edit'),
('00000000-0000-0000-0000-000000000006', 'bookings.restaurant.cancel'),
('00000000-0000-0000-0000-000000000006', 'restaurants.recurring.manage'),
('00000000-0000-0000-0000-000000000006', 'restaurants.closures.manage'),
('00000000-0000-0000-0000-000000000006', 'requests.view'),
('00000000-0000-0000-0000-000000000006', 'reports.view'),
('00000000-0000-0000-0000-000000000006', 'reports.restaurants');

-- =============================================================
-- HELPER FUNCTIONS
-- =============================================================

-- Check if user has a specific permission (includes overrides + plan gating)
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_resort_id UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_override_effect permission_effect;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if super admin (has all permissions except those explicitly denied)
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND global_role = 'SUPER_ADMIN'
  ) INTO v_is_super_admin;
  
  IF v_is_super_admin THEN
    RETURN true;
  END IF;
  
  -- Check for explicit override first
  SELECT effect INTO v_override_effect
  FROM user_permission_overrides
  WHERE user_id = p_user_id 
    AND resort_id = p_resort_id 
    AND permission_key = p_permission_key;
  
  IF v_override_effect IS NOT NULL THEN
    RETURN v_override_effect = 'grant';
  END IF;
  
  -- Check role-based permissions
  SELECT EXISTS (
    SELECT 1 
    FROM user_resort_roles urr
    JOIN role_permissions rp ON rp.role_id = urr.role_id
    WHERE urr.user_id = p_user_id 
      AND urr.resort_id = p_resort_id
      AND rp.permission_key = p_permission_key
  ) INTO v_has_permission;
  
  -- Also check if user has the old resort_role that maps to permissions
  IF NOT v_has_permission THEN
    SELECT EXISTS (
      SELECT 1 
      FROM resort_memberships rm
      WHERE rm.user_id = p_user_id 
        AND rm.resort_id = p_resort_id
        AND rm.resort_role IN ('RESORT_ADMIN')
    ) INTO v_has_permission;
  END IF;
  
  RETURN v_has_permission;
END;
$$;

-- Get all effective permissions for a user in a resort
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  p_user_id UUID,
  p_resort_id UUID
)
RETURNS TABLE(permission_key TEXT, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if super admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND global_role = 'SUPER_ADMIN'
  ) INTO v_is_super_admin;
  
  IF v_is_super_admin THEN
    -- Super admin has all permissions
    RETURN QUERY 
    SELECT p.key, 'super_admin'::TEXT 
    FROM permissions p;
    RETURN;
  END IF;
  
  -- Get role-based permissions + overrides
  RETURN QUERY
  WITH role_perms AS (
    SELECT DISTINCT rp.permission_key, 'role'::TEXT as source
    FROM user_resort_roles urr
    JOIN role_permissions rp ON rp.role_id = urr.role_id
    WHERE urr.user_id = p_user_id AND urr.resort_id = p_resort_id
  ),
  overrides AS (
    SELECT 
      upo.permission_key,
      CASE WHEN upo.effect = 'grant' THEN 'override_grant'::TEXT ELSE 'override_revoke'::TEXT END as source,
      upo.effect
    FROM user_permission_overrides upo
    WHERE upo.user_id = p_user_id AND upo.resort_id = p_resort_id
  ),
  combined AS (
    -- Start with role permissions
    SELECT rp.permission_key, rp.source
    FROM role_perms rp
    WHERE NOT EXISTS (
      SELECT 1 FROM overrides o WHERE o.permission_key = rp.permission_key AND o.effect = 'revoke'
    )
    UNION
    -- Add granted overrides
    SELECT o.permission_key, o.source
    FROM overrides o
    WHERE o.effect = 'grant'
  )
  SELECT * FROM combined;
END;
$$;

-- Log access change
CREATE OR REPLACE FUNCTION public.log_access_change(
  p_resort_id UUID,
  p_action_key TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO access_audit_log (resort_id, actor_user_id, action_key, target_user_id, details_json)
  VALUES (p_resort_id, auth.uid(), p_action_key, p_target_user_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Assign role to user (with audit logging)
CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id UUID,
  p_resort_id UUID,
  p_role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name TEXT;
  v_result_id UUID;
BEGIN
  -- Get role name for audit
  SELECT name INTO v_role_name FROM roles WHERE id = p_role_id;
  
  -- Insert the role assignment
  INSERT INTO user_resort_roles (user_id, resort_id, role_id)
  VALUES (p_user_id, p_resort_id, p_role_id)
  ON CONFLICT (user_id, resort_id, role_id) DO NOTHING
  RETURNING id INTO v_result_id;
  
  -- Log the action
  PERFORM log_access_change(
    p_resort_id,
    'role.assigned',
    p_user_id,
    jsonb_build_object('role_id', p_role_id, 'role_name', v_role_name)
  );
  
  RETURN jsonb_build_object('success', true, 'id', v_result_id);
END;
$$;

-- Remove role from user (with audit logging)
CREATE OR REPLACE FUNCTION public.remove_user_role(
  p_user_id UUID,
  p_resort_id UUID,
  p_role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Get role name for audit
  SELECT name INTO v_role_name FROM roles WHERE id = p_role_id;
  
  -- Delete the role assignment
  DELETE FROM user_resort_roles
  WHERE user_id = p_user_id AND resort_id = p_resort_id AND role_id = p_role_id;
  
  -- Log the action
  PERFORM log_access_change(
    p_resort_id,
    'role.removed',
    p_user_id,
    jsonb_build_object('role_id', p_role_id, 'role_name', v_role_name)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Set permission override (with audit logging)
CREATE OR REPLACE FUNCTION public.set_permission_override(
  p_user_id UUID,
  p_resort_id UUID,
  p_permission_key TEXT,
  p_effect permission_effect
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent non-super-admins from granting super admin permission
  IF p_permission_key = 'access.users.assign_superadmin' AND NOT is_super_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can manage this permission');
  END IF;
  
  -- Upsert the override
  INSERT INTO user_permission_overrides (user_id, resort_id, permission_key, effect, created_by)
  VALUES (p_user_id, p_resort_id, p_permission_key, p_effect, auth.uid())
  ON CONFLICT (user_id, resort_id, permission_key) 
  DO UPDATE SET effect = p_effect, created_by = auth.uid();
  
  -- Log the action
  PERFORM log_access_change(
    p_resort_id,
    'permission.override.' || p_effect::text,
    p_user_id,
    jsonb_build_object('permission_key', p_permission_key, 'effect', p_effect)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Remove permission override (with audit logging)
CREATE OR REPLACE FUNCTION public.remove_permission_override(
  p_user_id UUID,
  p_resort_id UUID,
  p_permission_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the override
  DELETE FROM user_permission_overrides
  WHERE user_id = p_user_id AND resort_id = p_resort_id AND permission_key = p_permission_key;
  
  -- Log the action
  PERFORM log_access_change(
    p_resort_id,
    'permission.override.removed',
    p_user_id,
    jsonb_build_object('permission_key', p_permission_key)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;