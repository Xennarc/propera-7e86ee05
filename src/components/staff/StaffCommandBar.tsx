import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  UtensilsCrossed,
  Activity,
  Settings,
  BarChart3,
  Plane,
  Clock,
  Plus,
  Bell,
  TrendingUp,
  XCircle,
  MessageSquare,
  Building2,
  Crown,
  User,
  FileText,
  Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItemDef {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  category: 'navigation' | 'actions' | 'recent';
  /** Feature flags required for this item to be visible */
  requiredFlags?: string[];
}

interface StaffCommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffCommandBar({ open, onOpenChange }: StaffCommandBarProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { currentResort } = useResort();
  const permissions = usePermissions();
  const flagContext = useFeatureFlagAccessSafe();

  // Feature flag check helper
  const checkFeatureFlags = useCallback((requiredFlags?: string[]): boolean => {
    if (!requiredFlags || requiredFlags.length === 0) return true;
    if (!flagContext || flagContext.loading) return true; // Fail open during loading
    return requiredFlags.every(flag => flagContext.isEnabledEffective(flag));
  }, [flagContext]);

  // Close and navigate
  const handleAction = useCallback((action: () => void) => {
    onOpenChange(false);
    setSearch('');
    action();
  }, [onOpenChange]);

  // Navigation items with feature flags
  const navigationItems: CommandItemDef[] = useMemo(() => [
    // Today / Operations
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Overview & stats',
      icon: Building2,
      action: () => navigate('/staff/dashboard'),
      keywords: ['home', 'overview', 'main'],
      category: 'navigation',
      requiredFlags: ['enable_dashboards'],
    },
    {
      id: 'today',
      title: "Today's Operations",
      subtitle: 'Live operational view',
      icon: Calendar,
      action: () => navigate('/staff/today'),
      keywords: ['operations', 'live', 'current'],
      category: 'navigation',
      requiredFlags: ['enable_dashboards'],
    },
    // Guests
    {
      id: 'guests',
      title: 'Guests',
      subtitle: 'Guest directory',
      icon: Users,
      action: () => navigate('/staff/guests'),
      keywords: ['visitors', 'customers', 'people'],
      category: 'navigation',
      requiredFlags: ['enable_guests'],
    },
    {
      id: 'prearrival',
      title: 'Pre-Arrival',
      subtitle: 'Upcoming arrivals',
      icon: Plane,
      action: () => navigate('/staff/prearrival'),
      keywords: ['arrivals', 'checkin', 'upcoming'],
      category: 'navigation',
      requiredFlags: ['enable_prearrival'],
    },
    {
      id: 'requests',
      title: 'Guest Requests',
      subtitle: 'Special requests & notes',
      icon: MessageSquare,
      action: () => navigate('/staff/requests-dashboard'),
      keywords: ['special', 'notes', 'messages', 'dashboard'],
      category: 'navigation',
      requiredFlags: ['enable_requests'],
    },
    // Activities (no flag - always visible)
    {
      id: 'activities',
      title: 'Activities',
      subtitle: 'Activity catalogue',
      icon: Activity,
      action: () => navigate('/staff/activities'),
      keywords: ['experiences', 'tours'],
      category: 'navigation',
    },
    {
      id: 'sessions',
      title: 'Activity Sessions',
      subtitle: 'Session schedule',
      icon: Clock,
      action: () => navigate('/staff/activities/sessions'),
      keywords: ['schedule', 'timeslots'],
      category: 'navigation',
    },
    // Dining (no flag - always visible)
    {
      id: 'restaurants',
      title: 'Restaurants',
      subtitle: 'Restaurant list',
      icon: UtensilsCrossed,
      action: () => navigate('/staff/restaurants'),
      keywords: ['dining', 'food', 'meals'],
      category: 'navigation',
    },
    {
      id: 'slots',
      title: 'Time Slots',
      subtitle: 'Dining time slots',
      icon: Clock,
      action: () => navigate('/staff/restaurants/slots'),
      keywords: ['reservations', 'tables', 'booking'],
      category: 'navigation',
    },
    // Transport
    {
      id: 'transport',
      title: 'Transport Dispatch',
      subtitle: 'Buggy management',
      icon: Car,
      action: () => navigate('/staff/transport'),
      keywords: ['buggy', 'dispatch', 'driver'],
      category: 'navigation',
      requiredFlags: ['enable_transport'],
    },
    // Reports
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'Analytics & insights',
      icon: BarChart3,
      action: () => navigate('/staff/reports'),
      keywords: ['analytics', 'stats', 'metrics'],
      category: 'navigation',
      requiredFlags: ['enable_reports'],
    },
    {
      id: 'reports-sales',
      title: 'Sales Report',
      subtitle: 'Revenue & sales performance',
      icon: TrendingUp,
      action: () => navigate('/staff/reports/sales'),
      keywords: ['revenue', 'money', 'performance'],
      category: 'navigation',
      requiredFlags: ['enable_reports'],
    },
    {
      id: 'reports-cancellations',
      title: 'Cancellations Report',
      subtitle: 'Cancelled bookings',
      icon: XCircle,
      action: () => navigate('/staff/reports/cancellations'),
      keywords: ['cancelled', 'refunds'],
      category: 'navigation',
      requiredFlags: ['enable_reports'],
    },
    {
      id: 'reports-feedback',
      title: 'Stay Feedback Report',
      subtitle: 'Guest feedback & reviews',
      icon: MessageSquare,
      action: () => navigate('/staff/reports/stay-feedback'),
      keywords: ['reviews', 'ratings', 'satisfaction'],
      category: 'navigation',
      requiredFlags: ['enable_reports'],
    },
    // Loyalty
    {
      id: 'loyalty',
      title: 'Loyalty Members',
      subtitle: 'Loyalty program members',
      icon: Crown,
      action: () => navigate('/staff/loyalty'),
      keywords: ['rewards', 'points', 'members'],
      category: 'navigation',
      requiredFlags: ['enable_loyalty'],
    },
    // Notifications (no flag)
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'View all notifications',
      icon: Bell,
      action: () => navigate('/staff/notifications'),
      keywords: ['alerts', 'messages', 'inbox'],
      category: 'navigation',
    },
    // Admin (no flag - role-based only)
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Resort configuration',
      icon: Settings,
      action: () => navigate('/staff/settings'),
      keywords: ['config', 'options', 'preferences'],
      category: 'navigation',
    },
    {
      id: 'prearrival-settings',
      title: 'Pre-Arrival Settings',
      subtitle: 'Configure pre-arrival forms',
      icon: Plane,
      action: () => navigate('/staff/settings/prearrival'),
      keywords: ['onboarding', 'checkin', 'forms'],
      category: 'navigation',
      requiredFlags: ['enable_prearrival'],
    },
  ], [navigate]);

  // Quick action items
  const actionItems: CommandItemDef[] = useMemo(() => [
    {
      id: 'new-session',
      title: 'New Session',
      subtitle: 'Create activity session',
      icon: Plus,
      action: () => navigate('/staff/activities/sessions/new'),
      keywords: ['add', 'create', 'session'],
      category: 'actions',
    },
    {
      id: 'new-slot',
      title: 'New Time Slot',
      subtitle: 'Create restaurant slot',
      icon: Plus,
      action: () => navigate('/staff/restaurants/slots/new'),
      keywords: ['add', 'create', 'reservation'],
      category: 'actions',
    },
    {
      id: 'add-guest',
      title: 'Add Guest',
      subtitle: 'Register new guest',
      icon: User,
      action: () => navigate('/staff/guests?action=add'),
      keywords: ['new', 'register', 'create'],
      category: 'actions',
      requiredFlags: ['enable_guests'],
    },
  ], [navigate]);

  // Super admin items
  const superAdminItems: CommandItemDef[] = useMemo(() => isSuperAdmin() ? [
    {
      id: 'command-center',
      title: 'Command Center',
      subtitle: 'Platform overview',
      icon: Crown,
      action: () => navigate('/superadmin'),
      keywords: ['admin', 'platform', 'control'],
      category: 'navigation',
    },
    {
      id: 'resorts-management',
      title: 'Resorts Management',
      subtitle: 'All resorts',
      icon: Building2,
      action: () => navigate('/superadmin/resorts'),
      keywords: ['properties', 'manage'],
      category: 'navigation',
    },
  ] : [], [isSuperAdmin, navigate]);

  // All items - filtered by feature flags
  const allItems = useMemo(() => {
    const items = [...navigationItems, ...actionItems, ...superAdminItems];
    return items.filter(item => checkFeatureFlags(item.requiredFlags));
  }, [navigationItems, actionItems, superAdminItems, checkFeatureFlags]);

  // Filter items based on search
  const filteredItems = search
    ? allItems.filter(item => {
        const searchLower = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.subtitle?.toLowerCase().includes(searchLower) ||
          item.keywords?.some(k => k.includes(searchLower))
        );
      })
    : allItems;

  // Group items by category
  const groupedItems = {
    navigation: filteredItems.filter(i => i.category === 'navigation'),
    actions: filteredItems.filter(i => i.category === 'actions'),
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search or jump to..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {groupedItems.navigation.length > 0 && (
          <CommandGroup heading="Pages">
            {groupedItems.navigation.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => handleAction(item.action)}
                className="flex items-center gap-3 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {groupedItems.actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              {groupedItems.actions.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleAction(item.action)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border p-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>Navigate with ↑↓ • Select with ↵</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-2xs">ESC to close</kbd>
        </div>
      </div>
    </CommandDialog>
  );
}

// Hook to handle keyboard shortcut
export function useStaffCommandBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
