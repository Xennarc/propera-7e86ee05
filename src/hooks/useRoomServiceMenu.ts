/**
 * Data hooks for Room Service menu browsing.
 * Resort-scoped, guest-portal safe (explicit IDs, no JWT).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

// ── Types ──────────────────────────────────────────────────────

export interface RoomServiceMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  tags: string[] | null;
  prep_time_minutes: number | null;
  is_featured: boolean;
  is_available: boolean;
  category_id: string;
  sort_order: number;
}

export interface RoomServiceCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface RoomServiceModifierGroup {
  id: string;
  name: string;
  selection_type: 'single' | 'multiple';
  min_selected: number;
  max_selected: number | null;
  sort_order: number;
  options: RoomServiceModifierOption[];
}

export interface RoomServiceModifierOption {
  id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
}

export interface RoomServiceOrderingHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch all active categories for the guest's resort.
 */
export function useRoomServiceCategories() {
  const { guest } = useGuestAuth();
  const resortId = guest?.resortId;

  return useQuery({
    queryKey: ['room-service-categories', resortId],
    queryFn: async (): Promise<RoomServiceCategory[]> => {
      const { data, error } = await supabase
        .from('room_service_menu_categories')
        .select('id, name, description, sort_order')
        .eq('resort_id', resortId!)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!resortId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch menu items, optionally filtered by category and search term.
 */
export function useRoomServiceItems(categoryId?: string, search?: string) {
  const { guest } = useGuestAuth();
  const resortId = guest?.resortId;

  return useQuery({
    queryKey: ['room-service-items', resortId, categoryId || 'all', search || ''],
    queryFn: async (): Promise<RoomServiceMenuItem[]> => {
      let query = supabase
        .from('room_service_menu_items')
        .select('id, name, description, price, currency, image_url, dietary_tags, allergens, tags, prep_time_minutes, is_featured, is_available, category_id, sort_order')
        .eq('resort_id', resortId!)
        .eq('is_active', true)
        .order('sort_order');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (search && search.trim().length > 0) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RoomServiceMenuItem[];
    },
    enabled: !!resortId,
    staleTime: 2 * 60_000,
  });
}

/**
 * Fetch modifier groups + options for a specific menu item.
 */
export function useRoomServiceItemModifiers(itemId: string | undefined) {
  const { guest } = useGuestAuth();
  const resortId = guest?.resortId;

  return useQuery({
    queryKey: ['room-service-item-modifiers', resortId, itemId],
    queryFn: async (): Promise<RoomServiceModifierGroup[]> => {
      // Get linked modifier group IDs for this item
      const { data: links, error: linkErr } = await supabase
        .from('room_service_item_modifier_groups')
        .select('group_id, sort_order')
        .eq('item_id', itemId!)
        .eq('resort_id', resortId!)
        .order('sort_order');

      if (linkErr) throw linkErr;
      if (!links || links.length === 0) return [];

      const groupIds = links.map(l => l.group_id);

      // Fetch the groups
      const { data: groups, error: gErr } = await supabase
        .from('room_service_modifier_groups')
        .select('id, name, selection_type, min_selected, max_selected, sort_order')
        .in('id', groupIds)
        .eq('is_active', true);

      if (gErr) throw gErr;
      if (!groups || groups.length === 0) return [];

      // Fetch all options for these groups
      const { data: options, error: oErr } = await supabase
        .from('room_service_modifier_options')
        .select('id, group_id, name, price_delta, is_available, sort_order')
        .in('group_id', groupIds)
        .eq('is_available', true)
        .order('sort_order');

      if (oErr) throw oErr;

      // Assemble
      const sortMap = Object.fromEntries(links.map(l => [l.group_id, l.sort_order]));
      return groups
        .map(g => ({
          ...g,
          selection_type: g.selection_type as 'single' | 'multiple',
          options: (options || []).filter(o => o.group_id === g.id),
        }))
        .sort((a, b) => (sortMap[a.id] ?? 0) - (sortMap[b.id] ?? 0));
    },
    enabled: !!resortId && !!itemId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch ordering hours for the resort (to show open/closed status).
 */
export function useRoomServiceOrderingHours() {
  const { guest } = useGuestAuth();
  const resortId = guest?.resortId;

  return useQuery({
    queryKey: ['room-service-hours', resortId],
    queryFn: async (): Promise<RoomServiceOrderingHours[]> => {
      const { data, error } = await supabase
        .from('room_service_ordering_hours')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('resort_id', resortId!)
        .eq('is_active', true)
        .order('day_of_week');
      if (error) throw error;
      return (data || []) as RoomServiceOrderingHours[];
    },
    enabled: !!resortId,
    staleTime: 10 * 60_000,
  });
}

/**
 * Check if room service is currently open based on ordering hours.
 */
export function useRoomServiceOpenStatus() {
  const { data: hours, isLoading } = useRoomServiceOrderingHours();

  if (isLoading) return { isOpen: true, isLoading: true, nextOpenTime: null };

  // No hours configured = always open
  if (!hours || hours.length === 0) {
    return { isOpen: true, isLoading: false, nextOpenTime: null };
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  const todayHours = hours.find(h => h.day_of_week === dayOfWeek);
  const isOpen = todayHours
    ? currentTime >= todayHours.start_time && currentTime <= todayHours.end_time
    : false;

  // Find next open time
  let nextOpenTime: string | null = null;
  if (!isOpen) {
    // Check remaining today
    if (todayHours && currentTime < todayHours.start_time) {
      nextOpenTime = todayHours.start_time;
    } else {
      // Find next day
      for (let i = 1; i <= 7; i++) {
        const nextDay = (dayOfWeek + i) % 7;
        const nextHours = hours.find(h => h.day_of_week === nextDay);
        if (nextHours) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          nextOpenTime = `${dayNames[nextDay]} ${nextHours.start_time}`;
          break;
        }
      }
    }
  }

  return { isOpen, isLoading: false, nextOpenTime };
}
