// RBAC Types for Propera

export type PermissionEffect = 'grant' | 'revoke';

export interface Permission {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  is_dangerous: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  resort_id: string | null;
  name: string;
  description: string | null;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_key: string;
  created_at: string;
}

export interface UserResortRole {
  id: string;
  user_id: string;
  resort_id: string;
  role_id: string;
  created_at: string;
  role?: Role;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  resort_id: string;
  permission_key: string;
  effect: PermissionEffect;
  created_at: string;
  created_by: string | null;
}

export interface AccessAuditLog {
  id: string;
  resort_id: string | null;
  actor_user_id: string;
  action_key: string;
  target_user_id: string | null;
  details_json: Record<string, unknown>;
  created_at: string;
  actor?: {
    full_name: string | null;
    username: string | null;
  };
  target?: {
    full_name: string | null;
    username: string | null;
  };
}

export interface EffectivePermission {
  permission_key: string;
  source: 'role' | 'override_grant' | 'override_revoke' | 'super_admin';
}

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = [
  'Identity & Access',
  'Resort Settings',
  'Guests & Stays',
  'Pre-arrival',
  'Activities',
  'Dining',
  'Guest Portal',
  'Loyalty',
  'Messaging',
  'Reports',
  'Billing',
  'Integrations',
  'Danger Zone',
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];

// Action keys for audit log
export const AUDIT_ACTIONS = {
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REMOVED: 'role.removed',
  PERMISSION_OVERRIDE_GRANT: 'permission.override.grant',
  PERMISSION_OVERRIDE_REVOKE: 'permission.override.revoke',
  PERMISSION_OVERRIDE_REMOVED: 'permission.override.removed',
  USER_INVITED: 'user.invited',
  USER_REMOVED: 'user.removed',
  USER_PASSWORD_RESET: 'user.password_reset',
} as const;

// Human-readable action labels
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'role.assigned': 'Role Assigned',
  'role.removed': 'Role Removed',
  'permission.override.grant': 'Permission Granted',
  'permission.override.revoke': 'Permission Revoked',
  'permission.override.removed': 'Override Removed',
  'user.invited': 'User Invited',
  'user.removed': 'User Removed',
  'user.password_reset': 'Password Reset',
};
