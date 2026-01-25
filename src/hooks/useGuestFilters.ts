import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Guest } from '@/types/database';
import { GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';
import { 
  isWithinInterval, 
  isToday, 
  startOfDay, 
  addDays, 
  isBefore, 
  isAfter,
  differenceInDays 
} from 'date-fns';
import { safeParseDateISO } from '@/lib/safe-date-format';

// Status filter types
export type GuestStatusFilter = 
  | 'pre-arrival' 
  | 'arriving-today' 
  | 'in-house' 
  | 'checking-out-today' 
  | 'checked-out';

// Flag filter types  
export type GuestFlagFilter = 
  | 'vip' 
  | 'allergy' 
  | 'dietary' 
  | 'transfer' 
  | 'occasion' 
  | 'late-arrival';

// Sort options
export type GuestSortOption = 
  | 'arrival-asc' 
  | 'arrival-desc' 
  | 'departure' 
  | 'room' 
  | 'name' 
  | 'vip-first';

// Legacy filter type for backwards compatibility
export type LegacyGuestFilter = 
  | 'all' 
  | 'in-house' 
  | 'arrivals' 
  | 'departures' 
  | 'prearrival-pending' 
  | 'prearrival-completed' 
  | 'has-allergies' 
  | 'arriving-72h';

export interface GuestFiltersState {
  search: string;
  statusFilters: GuestStatusFilter[];
  flagFilters: GuestFlagFilter[];
  sortBy: GuestSortOption;
  // Legacy filter for backward compatibility
  legacyFilter: LegacyGuestFilter;
}

interface GuestWithStatus {
  guest: Guest;
  status: GuestPrearrivalStatus | undefined;
  isInHouse: boolean;
  isArrivingToday: boolean;
  isDepartingToday: boolean;
  isFutureArrival: boolean;
  isCheckedOut: boolean;
  daysUntilArrival: number;
  daysUntilDeparture: number;
}

const DEFAULT_FILTERS: GuestFiltersState = {
  search: '',
  statusFilters: [],
  flagFilters: [],
  sortBy: 'arrival-asc',
  legacyFilter: 'all',
};

// Helper functions for guest status
function isCurrentGuest(guest: Guest): boolean {
  const today = new Date();
  const checkIn = safeParseDateISO(guest.check_in_date);
  const checkOut = safeParseDateISO(guest.check_out_date);
  if (!checkIn || !checkOut) return false;
  try {
    return isWithinInterval(today, { start: checkIn, end: checkOut });
  } catch {
    return false;
  }
}

function isArrivalToday(guest: Guest): boolean {
  const checkIn = safeParseDateISO(guest.check_in_date);
  if (!checkIn) return false;
  return isToday(checkIn);
}

function isDepartureToday(guest: Guest): boolean {
  const checkOut = safeParseDateISO(guest.check_out_date);
  if (!checkOut) return false;
  return isToday(checkOut);
}

function isFutureArrival(guest: Guest): boolean {
  const checkIn = safeParseDateISO(guest.check_in_date);
  if (!checkIn) return false;
  return isAfter(checkIn, new Date());
}

function isCheckedOut(guest: Guest): boolean {
  const checkOut = safeParseDateISO(guest.check_out_date);
  if (!checkOut) return false;
  return isBefore(checkOut, startOfDay(new Date()));
}

function isArrivingInNext7Days(guest: Guest): boolean {
  const checkIn = safeParseDateISO(guest.check_in_date);
  if (!checkIn) return false;
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);
  return isAfter(checkIn, today) && isBefore(checkIn, in7Days);
}

function isArrivingIn72Hours(guest: Guest): boolean {
  const checkIn = safeParseDateISO(guest.check_in_date);
  if (!checkIn) return false;
  const today = startOfDay(new Date());
  const in3Days = addDays(today, 3);
  return isAfter(checkIn, today) && isBefore(checkIn, in3Days);
}

export interface GuestStatusInfo {
  label: string;
  variant: 'success' | 'warning' | 'pending' | 'secondary' | 'confirmed' | 'default';
  countdown?: string;
}

export function getGuestStatusWithCountdown(guest: Guest): GuestStatusInfo {
  const checkIn = safeParseDateISO(guest.check_in_date);
  const checkOut = safeParseDateISO(guest.check_out_date);
  const today = startOfDay(new Date());
  
  if (!checkIn || !checkOut) {
    return { label: 'Unknown', variant: 'secondary' };
  }

  if (isToday(checkIn)) {
    return { label: 'Arriving Today', variant: 'success' };
  }
  
  if (isToday(checkOut)) {
    return { label: 'Departing Today', variant: 'warning' };
  }
  
  if (isCurrentGuest(guest)) {
    const daysLeft = differenceInDays(checkOut, today);
    return { 
      label: 'In-House', 
      variant: 'confirmed',
      countdown: `${daysLeft}d left` 
    };
  }
  
  if (isBefore(today, checkIn)) {
    const daysUntil = differenceInDays(checkIn, today);
    return { 
      label: 'Pre-Arrival', 
      variant: 'pending',
      countdown: `in ${daysUntil}d`
    };
  }
  
  return { label: 'Checked Out', variant: 'secondary' };
}

export function useGuestFilters(
  guests: Guest[],
  prearrivalStatuses: Record<string, GuestPrearrivalStatus> | undefined,
  prearrivalEnabled: boolean
) {
  const [filters, setFilters] = useState<GuestFiltersState>(DEFAULT_FILTERS);
  
  // Debounce search input
  const debouncedSearch = useDebounce(filters.search, 300);

  // Compute guest status info once
  const guestsWithStatus = useMemo(() => {
    const today = startOfDay(new Date());
    
    return guests.map((guest): GuestWithStatus => {
      const checkIn = safeParseDateISO(guest.check_in_date);
      const checkOut = safeParseDateISO(guest.check_out_date);
      
      return {
        guest,
        status: prearrivalStatuses?.[guest.id],
        isInHouse: isCurrentGuest(guest),
        isArrivingToday: isArrivalToday(guest),
        isDepartingToday: isDepartureToday(guest),
        isFutureArrival: isFutureArrival(guest),
        isCheckedOut: isCheckedOut(guest),
        daysUntilArrival: checkIn ? differenceInDays(checkIn, today) : 999,
        daysUntilDeparture: checkOut ? differenceInDays(checkOut, today) : 999,
      };
    });
  }, [guests, prearrivalStatuses]);

  // Calculate stats
  const stats = useMemo(() => {
    const inHouse = guestsWithStatus.filter(g => g.isInHouse).length;
    const arrivingToday = guestsWithStatus.filter(g => g.isArrivingToday).length;
    const departingToday = guestsWithStatus.filter(g => g.isDepartingToday).length;
    const preArrivals = guestsWithStatus.filter(g => g.isFutureArrival).length;
    const vips = guests.filter(g => g.is_vip).length;
    
    // Prearrival-specific stats
    const prearrivalPending = prearrivalEnabled 
      ? guestsWithStatus.filter(g => {
          return g.isFutureArrival && (!g.status?.prearrivalStatus || g.status.prearrivalStatus === 'not_started');
        }).length
      : 0;
    const prearrivalCompleted = prearrivalEnabled
      ? guestsWithStatus.filter(g => {
          return g.isFutureArrival && g.status?.prearrivalStatus === 'completed';
        }).length
      : 0;
    const arriving72h = guestsWithStatus.filter(g => isArrivingIn72Hours(g.guest)).length;

    return { 
      total: guests.length,
      inHouse, 
      arrivingToday, 
      departingToday, 
      preArrivals, 
      vips,
      prearrivalPending,
      prearrivalCompleted,
      arriving72h,
    };
  }, [guestsWithStatus, guests, prearrivalEnabled]);

  // Filter guests based on all filter criteria
  const filteredGuests = useMemo(() => {
    let result = guestsWithStatus;

    // Apply legacy filter (for backward compatibility with summary strip clicks)
    switch (filters.legacyFilter) {
      case 'in-house':
        result = result.filter(g => g.isInHouse);
        break;
      case 'arrivals':
        result = result.filter(g => g.isArrivingToday);
        break;
      case 'departures':
        result = result.filter(g => g.isDepartingToday);
        break;
      case 'prearrival-pending':
        result = result.filter(g => 
          isArrivingInNext7Days(g.guest) && 
          (!g.status?.prearrivalStatus || g.status.prearrivalStatus !== 'completed')
        );
        break;
      case 'prearrival-completed':
        result = result.filter(g => 
          g.isFutureArrival && g.status?.prearrivalStatus === 'completed'
        );
        break;
      case 'arriving-72h':
        result = result.filter(g => isArrivingIn72Hours(g.guest));
        break;
      case 'has-allergies':
        result = result.filter(g => g.isFutureArrival);
        break;
      case 'all':
      default:
        // No filtering for 'all'
        break;
    }

    // Apply status filters (multi-select)
    if (filters.statusFilters.length > 0) {
      result = result.filter(g => {
        return filters.statusFilters.some(statusFilter => {
          switch (statusFilter) {
            case 'pre-arrival': return g.isFutureArrival;
            case 'arriving-today': return g.isArrivingToday;
            case 'in-house': return g.isInHouse;
            case 'checking-out-today': return g.isDepartingToday;
            case 'checked-out': return g.isCheckedOut;
            default: return false;
          }
        });
      });
    }

    // Apply flag filters (multi-select)
    if (filters.flagFilters.length > 0) {
      result = result.filter(g => {
        return filters.flagFilters.some(flagFilter => {
          switch (flagFilter) {
            case 'vip': return g.guest.is_vip;
            case 'allergy': return g.status?.hasAllergies;
            case 'dietary': return g.status?.hasDietaryPreferences;
            case 'transfer': return g.status?.requiresTransfer;
            case 'occasion': return g.status?.hasSpecialOccasions;
            case 'late-arrival': return g.status?.isLateArrival;
            default: return false;
          }
        });
      });
    }

    // Apply search (debounced)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(g =>
        g.guest.full_name.toLowerCase().includes(searchLower) ||
        g.guest.room_number?.toLowerCase().includes(searchLower) ||
        g.guest.booking_reference?.toLowerCase().includes(searchLower) ||
        g.guest.email?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case 'arrival-asc':
          return a.daysUntilArrival - b.daysUntilArrival;
        case 'arrival-desc':
          return b.daysUntilArrival - a.daysUntilArrival;
        case 'departure':
          return a.daysUntilDeparture - b.daysUntilDeparture;
        case 'room':
          return (a.guest.room_number || '').localeCompare(b.guest.room_number || '');
        case 'name':
          return a.guest.full_name.localeCompare(b.guest.full_name);
        case 'vip-first':
          if (a.guest.is_vip && !b.guest.is_vip) return -1;
          if (!a.guest.is_vip && b.guest.is_vip) return 1;
          return a.daysUntilArrival - b.daysUntilArrival;
        default:
          return 0;
      }
    });

    return result.map(g => g.guest);
  }, [guestsWithStatus, filters, debouncedSearch]);

  // Actions
  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }));
  }, []);

  const setLegacyFilter = useCallback((legacyFilter: LegacyGuestFilter) => {
    setFilters(prev => ({ ...prev, legacyFilter }));
  }, []);

  const setStatusFilters = useCallback((statusFilters: GuestStatusFilter[]) => {
    setFilters(prev => ({ ...prev, statusFilters, legacyFilter: 'all' }));
  }, []);

  const setFlagFilters = useCallback((flagFilters: GuestFlagFilter[]) => {
    setFilters(prev => ({ ...prev, flagFilters }));
  }, []);

  const setSortBy = useCallback((sortBy: GuestSortOption) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.statusFilters.length > 0 || 
    filters.flagFilters.length > 0 ||
    filters.legacyFilter !== 'all';

  return {
    filters,
    filteredGuests,
    stats,
    setSearch,
    setLegacyFilter,
    setStatusFilters,
    setFlagFilters,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    // Expose helpers
    getGuestStatusWithCountdown,
    isCurrentGuest,
    isFutureArrival,
  };
}
