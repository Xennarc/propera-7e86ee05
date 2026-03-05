/**
 * Department module definitions and templates for the settings UI.
 */
import type { DepartmentModuleKey } from '@/types/database';

export interface ModuleDef {
  key: DepartmentModuleKey;
  label: string;
  description: string;
  group: 'operations' | 'resources' | 'compliance';
}

export const ALL_DEPARTMENT_MODULES: ModuleDef[] = [
  // Operations
  { key: 'ops_planner', label: 'Planner', description: 'Visual calendar planner for sessions, shifts, and resources', group: 'operations' },
  { key: 'master_ops_sheet', label: 'Master Ops Sheet', description: 'Daily overview of all sessions with pax counts and status', group: 'operations' },
  { key: 'ops_inbox', label: 'Ops Inbox', description: 'Live feed of upcoming sessions with time-based filtering', group: 'operations' },
  { key: 'session_run_sheet', label: 'Session Run Sheet', description: 'Per-session manifest with guest details and check-in', group: 'operations' },
  // Resources
  { key: 'resources_assets', label: 'Assets', description: 'Manage boats, vehicles, and equipment', group: 'resources' },
  { key: 'resources_shifts', label: 'Staff Shifts', description: 'Manage staff shift assignments', group: 'resources' },
  { key: 'resources_unavailability', label: 'Unavailability', description: 'Track asset and staff unavailability', group: 'resources' },
  { key: 'pickup_runs', label: 'Pickup Runs', description: 'Manage guest pickup logistics', group: 'resources' },
  // Compliance
  { key: 'compliance_verify', label: 'Certification Verify', description: 'Verify guest certifications and qualifications', group: 'compliance' },
  { key: 'compliance_medical', label: 'Medical Review', description: 'Review guest medical declarations', group: 'compliance' },
];

export type DeptTemplate = 'activities' | 'dining' | 'spa' | 'kids_club';

export interface TemplateDef {
  key: DeptTemplate;
  label: string;
  description: string;
  enabledModules: DepartmentModuleKey[];
  suggestedCategories: string[];
}

export const DEPARTMENT_TEMPLATES: TemplateDef[] = [
  {
    key: 'activities',
    label: 'Activities Department',
    description: 'Full ops suite: planner, ops sheet, inbox, run sheet, resources',
    enabledModules: ['ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet', 'resources_assets', 'resources_shifts', 'resources_unavailability'],
    suggestedCategories: [],
  },
  {
    key: 'dining',
    label: 'Dining Department',
    description: 'Inbox, planner, and reservation ops',
    enabledModules: ['ops_planner', 'ops_inbox'],
    suggestedCategories: [],
  },
  {
    key: 'spa',
    label: 'Spa Department',
    description: 'Activities template with SPA category pre-selected',
    enabledModules: ['ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet', 'resources_shifts'],
    suggestedCategories: ['SPA'],
  },
  {
    key: 'kids_club',
    label: 'Kids Club',
    description: 'Activities template with suggested activity categories',
    enabledModules: ['ops_planner', 'master_ops_sheet', 'ops_inbox', 'session_run_sheet'],
    suggestedCategories: ['OTHER'],
  },
];

export const MODULE_GROUPS = [
  { key: 'operations' as const, label: 'Operations' },
  { key: 'resources' as const, label: 'Resources' },
  { key: 'compliance' as const, label: 'Compliance' },
] as const;
