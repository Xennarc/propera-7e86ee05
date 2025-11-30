// Notification types for Propera

export type NotificationAudience = 'STAFF' | 'GUEST';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WHATSAPP';

export type NotificationType =
  | 'ACTIVITY_BOOKING_PENDING'
  | 'ACTIVITY_BOOKING_CONFIRMED'
  | 'ACTIVITY_BOOKING_CANCELLED'
  | 'RESTAURANT_RESERVATION_PENDING'
  | 'RESTAURANT_RESERVATION_CONFIRMED'
  | 'RESTAURANT_RESERVATION_CANCELLED'
  | 'STAY_FEEDBACK_SUBMITTED'
  | 'DEMO_RESORT_EXPIRING_SOON'
  | 'GENERAL';

export interface Notification {
  id: string;
  resort_id: string | null;
  user_id: string | null;
  guest_id: string | null;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string | null;
  channel: NotificationChannel;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffNotificationParams {
  resort_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
}

export interface CreateStaffNotificationsForRolesParams {
  resort_id: string;
  roles: string[];
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
}

export interface CreateGuestNotificationParams {
  resort_id: string;
  guest_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
}
