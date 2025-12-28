// Vendor system types

export type ProviderType = 'IN_HOUSE' | 'VENDOR';
export type VendorBookingStatus = 'PENDING_ACK' | 'ACKED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW';
export type PayoutStatus = 'UNBATCHED' | 'BATCHED' | 'PAID';
export type VendorRequestType = 'REQUEST_CHANGE' | 'NOTE';
export type VendorRequestStatus = 'open' | 'resolved';
export type VendorResortStatus = 'approved' | 'suspended';
export type AccountType = 'staff' | 'guest' | 'vendor';
export type VendorRole = 'vendor_admin' | 'vendor_staff';

export interface Vendor {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  default_commission_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface VendorResort {
  id: string;
  vendor_id: string;
  resort_id: string;
  status: VendorResortStatus;
  commission_rate_override: number | null;
  operational_notes: string | null;
  ack_sla_minutes: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vendor?: Vendor;
  resort?: { id: string; name: string; code: string };
}

export interface VendorBookingRequest {
  id: string;
  booking_id: string;
  vendor_id: string;
  resort_id: string;
  type: VendorRequestType;
  message: string;
  status: VendorRequestStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  vendor?: Vendor;
}

export interface VendorBooking {
  booking_id: string;
  session_id: string;
  resort_id: string;
  resort_name: string;
  activity_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  room_number: string;
  num_adults: number;
  num_children: number;
  notes: string | null;
  vendor_status: VendorBookingStatus;
  total_amount: number;
  created_at: string;
}

// Extended activity types with vendor fields
export interface ActivityWithVendor {
  id: string;
  name: string;
  provider_type: ProviderType;
  vendor_id: string | null;
  vendor?: Vendor;
}

// Extended booking types with vendor fields
export interface ActivityBookingWithVendor {
  id: string;
  provider_type: ProviderType;
  vendor_id: string | null;
  vendor_status: VendorBookingStatus | null;
  vendor_rate_used: number | null;
  vendor_amount: number | null;
  resort_commission_amount: number | null;
  payout_status: PayoutStatus;
  vendor_last_notified_at: string | null;
  vendor?: Vendor;
}
