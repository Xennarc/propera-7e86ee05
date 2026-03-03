/**
 * Shared TypeScript types for Total Ops v1 tables.
 * These supplement the auto-generated Supabase types with
 * stricter domain types used across hooks and components.
 */

// ── ops_assets ──────────────────────────────────────────────
export type OpsAssetType = 'boat' | 'equipment';

export interface OpsAsset {
  id: string;
  resort_id: string;
  type: OpsAssetType;
  name: string;
  capacity_int: number | null;
  meta_json: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── session_staff_assignments ───────────────────────────────
export type StaffAssignmentRole = 'guide' | 'instructor' | 'captain' | 'crew';

export interface SessionStaffAssignment {
  id: string;
  resort_id: string;
  session_id: string;
  staff_user_id: string;
  role: StaffAssignmentRole;
  assigned_by: string | null;
  created_at: string;
}

// ── Verification & medical review (activity_booking_readiness extensions) ──
export type CertVerificationStatus = 'unverified' | 'verified' | 'rejected' | 'not_required';
export type MedicalReviewStatus = 'not_required' | 'pending' | 'cleared' | 'requires_followup';

export interface ReadinessVerification {
  cert_verification_status: CertVerificationStatus;
  cert_verified_by: string | null;
  cert_verified_at: string | null;
  cert_notes: string | null;
  medical_review_status: MedicalReviewStatus;
  medical_reviewed_by: string | null;
  medical_reviewed_at: string | null;
  medical_notes: string | null;
  medical_answers_json: Record<string, unknown> | null;
}

// ── session_transport_links ─────────────────────────────────
export type TransportLinkType = 'pickup' | 'dropoff';

export interface SessionTransportLink {
  id: string;
  resort_id: string;
  session_id: string;
  trip_id: string;
  link_type: TransportLinkType;
  created_at: string;
}
