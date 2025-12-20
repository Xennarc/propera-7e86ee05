import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
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
  Building2,
  User,
  Calendar,
  Utensils,
  Search,
  Star,
  Clock,
  Settings,
  Eye,
  ToggleRight,
  ClipboardList,
  Activity,
  Headset,
  ArrowRight,
} from 'lucide-react';

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const [search, setSearch] = useState('');

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Recent items (stored in localStorage)
  const [recentItems, setRecentItems] = useState<{ type: string; id: string; label: string; url: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('superadmin-recent') || '[]');
    } catch {
      return [];
    }
  });

  // Favorites (stored in localStorage)
  const [favorites, setFavorites] = useState<{ type: string; id: string; label: string; url: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('superadmin-favorites') || '[]');
    } catch {
      return [];
    }
  });

  const addRecent = useCallback((item: { type: string; id: string; label: string; url: string }) => {
    setRecentItems(prev => {
      const filtered = prev.filter(r => r.id !== item.id);
      const updated = [item, ...filtered].slice(0, 5);
      localStorage.setItem('superadmin-recent', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Search users
  const { data: searchedUsers } = useQuery({
    queryKey: ['command-search-users', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length >= 2,
  });

  // Search guests
  const { data: searchedGuests } = useQuery({
    queryKey: ['command-search-guests', search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data } = await supabase
        .from('guests')
        .select('id, full_name, room_number, resort_id')
        .or(`full_name.ilike.%${search}%,room_number.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length >= 2,
  });

  const filteredResorts = search.length >= 1
    ? resorts.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()))
    : resorts.slice(0, 5);

  const quickActions = [
    { label: 'Open Command Center', icon: Activity, url: '/superadmin', keywords: 'dashboard home' },
    { label: 'Manage All Resorts', icon: Building2, url: '/superadmin/resorts', keywords: 'resorts' },
    { label: 'View Users & Access', icon: User, url: '/superadmin/users', keywords: 'users staff' },
    { label: 'Feature Flags', icon: ToggleRight, url: '/superadmin/feature-flags', keywords: 'flags toggles' },
    { label: 'Health Monitoring', icon: Activity, url: '/superadmin/health', keywords: 'health errors' },
    { label: 'Audit Log', icon: ClipboardList, url: '/superadmin/audit', keywords: 'audit logs history' },
    { label: 'Support Tools', icon: Headset, url: '/superadmin/support', keywords: 'support view-as debug' },
  ];

  const filteredActions = search.length >= 1
    ? quickActions.filter(a => 
        a.label.toLowerCase().includes(search.toLowerCase()) || 
        a.keywords.includes(search.toLowerCase())
      )
    : quickActions;

  const handleSelect = (url: string, label: string, type: string, id: string) => {
    addRecent({ type, id, label, url });
    navigate(url);
    onOpenChange(false);
    setSearch('');
  };

  const handleSwitchToResort = (resortId: string, resortName: string) => {
    const resort = resorts.find(r => r.id === resortId);
    if (resort) {
      setCurrentResort(resort);
      addRecent({ type: 'resort', id: resortId, label: resortName, url: '/staff/dashboard' });
      navigate('/staff/dashboard');
      onOpenChange(false);
      setSearch('');
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search resorts, users, or type a command..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Favorites */}
        {favorites.length > 0 && search.length === 0 && (
          <CommandGroup heading="Favorites">
            {favorites.map(fav => (
              <CommandItem 
                key={fav.id} 
                onSelect={() => handleSelect(fav.url, fav.label, fav.type, fav.id)}
              >
                <Star className="mr-2 h-4 w-4 text-warning" />
                <span>{fav.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent */}
        {recentItems.length > 0 && search.length === 0 && (
          <CommandGroup heading="Recent">
            {recentItems.map(item => (
              <CommandItem 
                key={item.id} 
                onSelect={() => handleSelect(item.url, item.label, item.type, item.id)}
              >
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
                <Badge variant="outline" className="ml-auto text-[9px]">{item.type}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Quick Actions */}
        {filteredActions.length > 0 && (
          <CommandGroup heading="Quick Actions">
            {filteredActions.map(action => (
              <CommandItem 
                key={action.url} 
                onSelect={() => handleSelect(action.url, action.label, 'page', action.url)}
              >
                <action.icon className="mr-2 h-4 w-4" />
                <span>{action.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Resorts */}
        {filteredResorts.length > 0 && (
          <CommandGroup heading="Resorts">
            {filteredResorts.slice(0, 6).map(resort => (
              <CommandItem 
                key={resort.id}
                onSelect={() => handleSelect(`/superadmin/resorts/${resort.id}`, resort.name, 'resort', resort.id)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span>{resort.name}</span>
                {resort.is_demo && <Badge variant="outline" className="ml-2 text-[9px]">DEMO</Badge>}
                <div className="ml-auto flex items-center gap-2">
                  <button 
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwitchToResort(resort.id, resort.name);
                    }}
                  >
                    Switch
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Users */}
        {searchedUsers && searchedUsers.length > 0 && (
          <CommandGroup heading="Users">
            {searchedUsers.map(user => (
              <CommandItem 
                key={user.id}
                onSelect={() => handleSelect(`/superadmin/users`, user.full_name || user.username || 'User', 'user', user.id)}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{user.full_name || user.username}</span>
                {user.username && <span className="ml-2 text-muted-foreground text-xs">@{user.username}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Guests */}
        {searchedGuests && searchedGuests.length > 0 && (
          <CommandGroup heading="Guests">
            {searchedGuests.map(guest => (
              <CommandItem 
                key={guest.id}
                onSelect={() => {
                  const resort = resorts.find(r => r.id === guest.resort_id);
                  if (resort) setCurrentResort(resort);
                  handleSelect(`/staff/guests/${guest.id}`, guest.full_name, 'guest', guest.id);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{guest.full_name}</span>
                <span className="ml-2 text-muted-foreground text-xs">Room {guest.room_number}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
