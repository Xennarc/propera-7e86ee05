// Notification utility functions for Propera

import { supabase } from '@/integrations/supabase/client';
import type { 
  CreateStaffNotificationParams, 
  CreateStaffNotificationsForRolesParams,
  CreateGuestNotificationParams 
} from '@/types/notifications';
import type { ResortRole } from '@/types/database';

/**
 * Create notifications for all staff members with specific roles in a resort
 */
export async function createStaffNotificationsForRoles(
  params: Omit<CreateStaffNotificationsForRolesParams, 'roles'> & { roles: ResortRole[] }
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_staff_notifications_for_roles', {
      p_resort_id: params.resort_id,
      p_roles: params.roles,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_link_url: params.link_url || null,
    });

    if (error) throw error;
    return { success: true, count: data as number };
  } catch (error) {
    console.error('Failed to create staff notifications:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a notification for a specific staff user
 */
export async function createStaffNotificationForUser(
  params: CreateStaffNotificationParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_staff_notification_for_user', {
      p_resort_id: params.resort_id,
      p_user_id: params.user_id,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_link_url: params.link_url || null,
    });

    if (error) throw error;
    return { success: true, id: data as string };
  } catch (error) {
    console.error('Failed to create staff notification:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Create a notification for a guest
 */
export async function createGuestNotification(
  params: CreateGuestNotificationParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_guest_notification', {
      p_resort_id: params.resort_id,
      p_guest_id: params.guest_id,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_link_url: params.link_url || null,
    });

    if (error) throw error;
    return { success: true, id: data as string };
  } catch (error) {
    console.error('Failed to create guest notification:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Helper to format notification messages for activity bookings
 */
export function formatActivityBookingMessage(
  activityName: string,
  date: string,
  time: string,
  guestName?: string,
  roomNumber?: string
): { guest: { pending: string; confirmed: string; cancelled: string }; staff: { pending: string } } {
  return {
    guest: {
      pending: `We've received your request for ${activityName} on ${date} at ${time}. We'll confirm as soon as possible.`,
      confirmed: `Your booking for ${activityName} on ${date} at ${time} is confirmed.`,
      cancelled: `Your booking for ${activityName} on ${date} at ${time} has been cancelled. Please contact us if you need assistance.`,
    },
    staff: {
      pending: `${guestName} (Room ${roomNumber}) requested ${activityName} on ${date} at ${time}.`,
    },
  };
}

/**
 * Helper to format notification messages for restaurant reservations
 */
export function formatRestaurantReservationMessage(
  restaurantName: string,
  date: string,
  time: string,
  pax?: number,
  guestName?: string,
  roomNumber?: string
): { guest: { pending: string; confirmed: string; cancelled: string }; staff: { pending: string } } {
  return {
    guest: {
      pending: `We've received your request for ${restaurantName} on ${date} at ${time}. We'll confirm as soon as possible.`,
      confirmed: `Your reservation at ${restaurantName} on ${date} at ${time} is confirmed.`,
      cancelled: `Your reservation at ${restaurantName} on ${date} at ${time} has been cancelled.`,
    },
    staff: {
      pending: `${guestName} (Room ${roomNumber}) requested ${restaurantName} on ${date} at ${time} for ${pax} guests.`,
    },
  };
}

/**
 * Helper to format feedback notification message
 */
export function formatFeedbackMessage(
  guestName: string,
  checkOutDate: string,
  overallRating: number
): string {
  return `Feedback received from ${guestName}, check-out ${checkOutDate}. Overall rating: ${overallRating}/5.`;
}
