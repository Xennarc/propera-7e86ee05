import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions } from '@/hooks/usePermissions';
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
  Search,
  Building2,
  Crown,
  User,
  FileText,
  MessageSquare,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  category: 'navigation' | 'actions' | 'recent';
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

  // Close and navigate
  const handleAction = useCallback((action: () => void) => {
    onOpenChange(false);
    setSearch('');
    action();
  }, [onOpenChange]);

  // Navigation items
  const navigationItems: CommandItem[] = [
    // Today / Operations
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Overview & stats',
      icon: Building2,
      action: () => navigate('/staff/dashboard'),
      keywords: ['home', 'overview', 'main'],
      category: 'navigation',
    },
    {
      id: 'today',
      title: "Today's Operations",
      subtitle: 'Live operational view',
      icon: Calendar,
      action: () => navigate('/staff/today'),
      keywords: ['operations', 'live', 'current'],
      category: 'navigation',
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
    },
    {
      id: 'prearrival',
      title: 'Pre-Arrival',
      subtitle: 'Upcoming arrivals',
      icon: Plane,
      action: () => navigate('/staff/prearrival'),
      keywords: ['arrivals', 'checkin', 'upcoming'],
      category: 'navigation',
    },
    {
      id: 'requests',
      title: 'Guest Requests',
      subtitle: 'Special requests & notes',
      icon: MessageSquare,
      action: () => navigate('/staff/guest-requests'),
      keywords: ['special', 'notes', 'messages'],
      category: 'navigation',
    },
    // Activities
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
    // Dining
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
    // Reports
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'Analytics & insights',
      icon: BarChart3,
      action: () => navigate('/staff/reports'),
      keywords: ['analytics', 'stats', 'metrics'],
      category: 'navigation',
    },
    // Admin
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Resort configuration',
      icon: Settings,
      action: () => navigate('/staff/settings'),
      keywords: ['config', 'options', 'preferences'],
      category: 'navigation',
    },
  ];

  // Quick action items
  const actionItems: CommandItem[] = [
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
    },
  ];

  // Super admin items
  const superAdminItems: CommandItem[] = isSuperAdmin() ? [
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
  ] : [];

  // All items
  const allItems = [...navigationItems, ...actionItems, ...superAdminItems];

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
