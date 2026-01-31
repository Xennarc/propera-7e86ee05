import { useState, useCallback, useMemo } from 'react';
import { ResortRole, GlobalRole } from '@/types/database';

export type UserStatus = 'all' | 'active' | 'disabled' | 'deleted';
export type AccessType = 'any' | 'has_access' | 'no_access';
export type SortBy = 'name' | 'joined' | 'resorts_count';
export type SortDir = 'asc' | 'desc';

export interface UsersFilter {
  q: string;
  status: UserStatus;
  resortId: string; // 'all' or UUID
  resortRole: string; // 'all' or ResortRole
  globalRole: string; // 'all' | 'SUPER_ADMIN' | 'STANDARD'
  access: AccessType;
  multiResortOnly: boolean;
  joinedFrom?: string; // YYYY-MM-DD
  joinedTo?: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

export const DEFAULT_USERS_FILTER: UsersFilter = {
  q: '',
  status: 'all',
  resortId: 'all',
  resortRole: 'all',
  globalRole: 'all',
  access: 'any',
  multiResortOnly: false,
  joinedFrom: undefined,
  joinedTo: undefined,
  sortBy: 'name',
  sortDir: 'asc',
};

// Preset views
export interface SavedView {
  id: string;
  name: string;
  filter: Partial<UsersFilter>;
  isDefault?: boolean;
}

export const DEFAULT_VIEWS: SavedView[] = [
  { id: 'all', name: 'All users', filter: {}, isDefault: true },
  { id: 'super-admins', name: 'Super Admins', filter: { globalRole: 'SUPER_ADMIN' }, isDefault: true },
  { id: 'no-access', name: 'No resort access', filter: { access: 'no_access' }, isDefault: true },
  { id: 'multi-resort', name: 'Multi-resort users', filter: { multiResortOnly: true }, isDefault: true },
  { id: 'disabled', name: 'Disabled users', filter: { status: 'disabled' }, isDefault: true },
];

const SAVED_VIEWS_KEY = 'propera_superadmin_saved_views';

export function useUsersFilter() {
  const [filter, setFilter] = useState<UsersFilter>(DEFAULT_USERS_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Load saved views from localStorage
  const [customViews, setCustomViews] = useState<SavedView[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_VIEWS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const allViews = useMemo(() => [...DEFAULT_VIEWS, ...customViews], [customViews]);

  const updateFilter = useCallback((updates: Partial<UsersFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
    setPage(1); // Reset to first page on filter change
  }, []);

  const resetFilter = useCallback(() => {
    setFilter(DEFAULT_USERS_FILTER);
    setPage(1);
  }, []);

  const applyView = useCallback((view: SavedView) => {
    setFilter({ ...DEFAULT_USERS_FILTER, ...view.filter });
    setPage(1);
  }, []);

  const saveCurrentView = useCallback((name: string) => {
    const newView: SavedView = {
      id: `custom_${Date.now()}`,
      name,
      filter: { ...filter },
    };
    const updated = [...customViews, newView];
    setCustomViews(updated);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save view:', e);
    }
    return newView;
  }, [filter, customViews]);

  const deleteView = useCallback((viewId: string) => {
    const updated = customViews.filter(v => v.id !== viewId);
    setCustomViews(updated);
    try {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete view:', e);
    }
  }, [customViews]);

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.q) count++;
    if (filter.status !== 'all') count++;
    if (filter.resortId !== 'all') count++;
    if (filter.resortRole !== 'all') count++;
    if (filter.globalRole !== 'all') count++;
    if (filter.access !== 'any') count++;
    if (filter.multiResortOnly) count++;
    if (filter.joinedFrom) count++;
    if (filter.joinedTo) count++;
    return count;
  }, [filter]);

  // Check if any filters are active
  const hasActiveFilters = activeFilterCount > 0 || filter.sortBy !== 'name' || filter.sortDir !== 'asc';

  return {
    filter,
    setFilter,
    updateFilter,
    resetFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    allViews,
    customViews,
    applyView,
    saveCurrentView,
    deleteView,
    activeFilterCount,
    hasActiveFilters,
  };
}

// Helper to get display labels for filters
export function getFilterLabel(key: keyof UsersFilter, value: unknown): string | null {
  switch (key) {
    case 'status':
      if (value === 'all') return null;
      return value === 'active' ? 'Active' : value === 'disabled' ? 'Disabled' : 'Deleted';
    case 'globalRole':
      if (value === 'all') return null;
      return value === 'SUPER_ADMIN' ? 'Super Admin' : 'Standard';
    case 'resortRole':
      if (value === 'all') return null;
      return String(value).replace(/_/g, ' ');
    case 'access':
      if (value === 'any') return null;
      return value === 'has_access' ? 'Has access' : 'No access';
    case 'multiResortOnly':
      return value ? 'Multi-resort' : null;
    case 'joinedFrom':
      return value ? `From ${value}` : null;
    case 'joinedTo':
      return value ? `To ${value}` : null;
    default:
      return null;
  }
}

// Type for user with memberships (matches existing)
export interface UserWithMemberships {
  id: string;
  full_name: string | null;
  username: string | null;
  global_role: GlobalRole;
  created_at: string;
  is_disabled: boolean;
  deleted_at: string | null;
  memberships: {
    id: string;
    resort_id: string;
    resort_name: string;
    resort_role: ResortRole;
  }[];
}

// Client-side filtering function
export function filterUsers(users: UserWithMemberships[], filter: UsersFilter): UserWithMemberships[] {
  let result = [...users];

  // Text search
  if (filter.q) {
    const query = filter.q.toLowerCase();
    result = result.filter(user => 
      user.full_name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  }

  // Status filter
  if (filter.status !== 'all') {
    result = result.filter(user => {
      if (filter.status === 'deleted') return !!user.deleted_at;
      if (filter.status === 'disabled') return user.is_disabled && !user.deleted_at;
      if (filter.status === 'active') return !user.is_disabled && !user.deleted_at;
      return true;
    });
  }

  // Resort filter
  if (filter.resortId !== 'all') {
    result = result.filter(user => 
      user.memberships.some(m => m.resort_id === filter.resortId)
    );
  }

  // Resort role filter
  if (filter.resortRole !== 'all') {
    result = result.filter(user => 
      user.memberships.some(m => m.resort_role === filter.resortRole)
    );
  }

  // Global role filter
  if (filter.globalRole !== 'all') {
    result = result.filter(user => user.global_role === filter.globalRole);
  }

  // Access type filter
  if (filter.access !== 'any') {
    if (filter.access === 'has_access') {
      result = result.filter(user => 
        user.memberships.length > 0 || user.global_role === 'SUPER_ADMIN'
      );
    } else if (filter.access === 'no_access') {
      result = result.filter(user => 
        user.memberships.length === 0 && user.global_role !== 'SUPER_ADMIN'
      );
    }
  }

  // Multi-resort filter
  if (filter.multiResortOnly) {
    result = result.filter(user => user.memberships.length >= 2);
  }

  // Date range filters
  if (filter.joinedFrom) {
    const fromDate = new Date(filter.joinedFrom);
    result = result.filter(user => new Date(user.created_at) >= fromDate);
  }
  if (filter.joinedTo) {
    const toDate = new Date(filter.joinedTo);
    toDate.setHours(23, 59, 59, 999);
    result = result.filter(user => new Date(user.created_at) <= toDate);
  }

  // Sorting
  result.sort((a, b) => {
    let comparison = 0;
    
    switch (filter.sortBy) {
      case 'name':
        const nameA = a.full_name || a.username || a.id;
        const nameB = b.full_name || b.username || b.id;
        comparison = nameA.localeCompare(nameB);
        break;
      case 'joined':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'resorts_count':
        comparison = a.memberships.length - b.memberships.length;
        break;
    }

    return filter.sortDir === 'desc' ? -comparison : comparison;
  });

  return result;
}

// Paginate results
export function paginateUsers(
  users: UserWithMemberships[], 
  page: number, 
  pageSize: number
): { items: UserWithMemberships[]; totalCount: number; totalPages: number } {
  const totalCount = users.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const items = users.slice(startIndex, startIndex + pageSize);
  
  return { items, totalCount, totalPages };
}
