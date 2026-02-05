 /**
  * Shared status display helpers for Guest Requests
  * Single source of truth for status presentation across guest and staff portals
  */
 
 import { CheckCircle2, Clock, XCircle, UserCheck, PlayCircle, AlertTriangle, type LucideIcon } from 'lucide-react';
 
 export type RequestStatus = 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
 
 export interface StatusDisplayConfig {
   label: string;
   staffLabel: string;
   badgeVariant: 'warning' | 'info' | 'primary' | 'success' | 'muted' | 'indigo';
   icon: LucideIcon;
   sortBucket: 'active' | 'past';
   className: string;
 }
 
 /**
  * Status configuration mapping
  * Guest labels are user-friendly, staff labels are operational
  */
 const STATUS_CONFIG: Record<RequestStatus, StatusDisplayConfig> = {
   NEW: {
     label: 'Submitted',
     staffLabel: 'New',
     badgeVariant: 'warning',
     icon: Clock,
     sortBucket: 'active',
     className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
   },
   ACKNOWLEDGED: {
     label: 'Received',
     staffLabel: 'Acknowledged',
     badgeVariant: 'info',
     icon: CheckCircle2,
     sortBucket: 'active',
     className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
   },
   ASSIGNED: {
     label: 'Assigned',
     staffLabel: 'Assigned',
     badgeVariant: 'indigo',
     icon: UserCheck,
     sortBucket: 'active',
     className: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
   },
   IN_PROGRESS: {
     label: 'In Progress',
     staffLabel: 'In Progress',
     badgeVariant: 'primary',
     icon: PlayCircle,
     sortBucket: 'active',
     className: 'bg-primary/15 text-primary border-primary/30',
   },
   COMPLETED: {
     label: 'Completed',
     staffLabel: 'Completed',
     badgeVariant: 'success',
     icon: CheckCircle2,
     sortBucket: 'past',
     className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
   },
   CANCELLED: {
     label: 'Cancelled',
     staffLabel: 'Cancelled',
     badgeVariant: 'muted',
     icon: XCircle,
     sortBucket: 'past',
     className: 'bg-muted text-muted-foreground border-muted',
   },
 };
 
 /**
  * Get display configuration for a single request status
  */
 export function getDisplayStatus(status: RequestStatus): StatusDisplayConfig {
   return STATUS_CONFIG[status] || STATUS_CONFIG.NEW;
 }
 
 /**
  * Check if a status is considered "active" (not final)
  */
 export function isActiveStatus(status: RequestStatus): boolean {
   return ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'].includes(status);
 }
 
 /**
  * Status aggregation rules for bundled submissions:
  * 
  * 1. If ANY child request is active (NEW, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS)
  *    -> Show the most advanced active status
  * 
  * 2. Else if ALL children are CANCELLED
  *    -> Show "Cancelled"
  * 
  * 3. Else if some cancelled and some completed (mixed final states)
  *    -> Show "Completed" but flag hasPartialCancellation
  * 
  * 4. Else (all completed)
  *    -> Show "Completed"
  */
 export interface AggregatedStatusResult {
   status: RequestStatus;
   label: string;
   config: StatusDisplayConfig;
   hasPartialCancellation: boolean;
 }
 
 export function getAggregatedSubmissionStatus(
   requests: Array<{ status: RequestStatus }>
 ): AggregatedStatusResult {
   if (!requests || requests.length === 0) {
     return {
       status: 'NEW',
       label: 'Submitted',
       config: STATUS_CONFIG.NEW,
       hasPartialCancellation: false,
     };
   }
 
   // Priority order for active statuses (higher = more progressed)
   const ACTIVE_PRIORITY: Record<string, number> = {
     NEW: 1,
     ACKNOWLEDGED: 2,
     ASSIGNED: 3,
     IN_PROGRESS: 4,
   };
 
   // Separate active and final requests
   const activeRequests = requests.filter((r) => isActiveStatus(r.status));
   const cancelledRequests = requests.filter((r) => r.status === 'CANCELLED');
   const completedRequests = requests.filter((r) => r.status === 'COMPLETED');
 
   // Rule 1: If any active, show the most progressed active status
   if (activeRequests.length > 0) {
     const mostAdvanced = activeRequests.reduce((best, current) => {
       const bestPriority = ACTIVE_PRIORITY[best.status] || 0;
       const currentPriority = ACTIVE_PRIORITY[current.status] || 0;
       return currentPriority > bestPriority ? current : best;
     });
     const config = STATUS_CONFIG[mostAdvanced.status];
     return {
       status: mostAdvanced.status,
       label: config.label,
       config,
       hasPartialCancellation: false,
     };
   }
 
   // Rule 2: If ALL are cancelled
   if (cancelledRequests.length === requests.length) {
     return {
       status: 'CANCELLED',
       label: 'Cancelled',
       config: STATUS_CONFIG.CANCELLED,
       hasPartialCancellation: false,
     };
   }
 
   // Rule 3 & 4: Some completed (and possibly some cancelled)
   const hasPartialCancellation = cancelledRequests.length > 0 && completedRequests.length > 0;
   return {
     status: 'COMPLETED',
     label: hasPartialCancellation ? 'Partially Completed' : 'Completed',
     config: STATUS_CONFIG.COMPLETED,
     hasPartialCancellation,
   };
 }
 
 /**
  * Department key to human-readable label mapping
  */
 const DEPARTMENT_LABELS: Record<string, string> = {
   HOUSEKEEPING: 'Housekeeping',
   housekeeping: 'Housekeeping',
   FRONT_DESK: 'Front Desk',
   front_desk: 'Front Desk',
   CONCIERGE: 'Concierge',
   concierge: 'Concierge',
   ROOM_SERVICE: 'Room Service',
   room_service: 'Room Service',
   F_AND_B: 'Food & Beverage',
   f_and_b: 'Food & Beverage',
   MAINTENANCE: 'Maintenance',
   maintenance: 'Maintenance',
   ENGINEERING: 'Engineering',
   engineering: 'Engineering',
   SPA: 'Spa',
   spa: 'Spa',
   ACTIVITIES: 'Activities',
   activities: 'Activities',
   TRANSPORT: 'Transport',
   transport: 'Transport',
   SECURITY: 'Security',
   security: 'Security',
   OTHER: 'General',
   other: 'General',
 };
 
 /**
  * Get human-readable department label from key
  */
 export function getDepartmentLabel(departmentKey: string | null | undefined): string {
   if (!departmentKey) return 'General';
   return DEPARTMENT_LABELS[departmentKey] || formatTitleCase(departmentKey);
 }
 
 /**
  * Format a snake_case or UPPER_CASE string to Title Case
  */
 function formatTitleCase(str: string): string {
   return str
     .toLowerCase()
     .replace(/_/g, ' ')
     .replace(/\b\w/g, (c) => c.toUpperCase());
 }
 
 /**
  * Derive a human-readable title from a list of requests
  * 
  * Rules:
  * - Single request: use the request title
  * - Multiple requests: "First Title + N more"
  */
 export function deriveRequestTitle(
   requests: Array<{ title: string }>
 ): string {
   if (!requests || requests.length === 0) return 'Request';
   if (requests.length === 1) return requests[0].title;
   
   const firstTitle = requests[0].title;
   const remaining = requests.length - 1;
   return `${firstTitle} + ${remaining} more`;
 }
 
 /**
  * Format department list for display
  * 
  * Rules:
  * - Single department: "Housekeeping"
  * - Two departments: "Housekeeping & Concierge"
  * - More: "Housekeeping + 2 more"
  */
 export function formatDepartments(
   requests: Array<{ department_key: string | null }>
 ): string {
   const uniqueDepts = [...new Set(
     requests
       .map((r) => getDepartmentLabel(r.department_key))
       .filter(Boolean)
   )];
   
   if (uniqueDepts.length === 0) return 'General';
   if (uniqueDepts.length === 1) return uniqueDepts[0];
   if (uniqueDepts.length === 2) return uniqueDepts.join(' & ');
   return `${uniqueDepts[0]} + ${uniqueDepts.length - 1} more`;
 }
 
 /**
  * Get the count of items from requests
  * Uses the items array if available, otherwise counts 1 per request
  */
 export function getTotalItemCount(
   requests: Array<{ items?: Array<{ quantity: number }> }>
 ): number {
   return requests.reduce((sum, r) => {
     if (r.items && r.items.length > 0) {
       return sum + r.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
     }
     return sum + 1;
   }, 0);
 }