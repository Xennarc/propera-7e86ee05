import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, User, Users, ArrowUpRight, ArrowDownRight, Building2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GuestDialog } from './GuestDialog';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { FilterBar, FilterBarGroup } from '@/components/ui/filter-bar';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isWithinInterval, parseISO, isToday, startOfDay, endOfDay } from 'date-fns';

type GuestFilter = 'all' | 'in-house' | 'arrivals' | 'departures';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  
  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchGuests = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('check_in_date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setGuests(data as Guest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGuests();
  }, [currentResort]);

  const handleDelete = async () => {
    if (!deleteGuest) return;
    
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', deleteGuest.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Guest deleted successfully' });
      fetchGuests();
    }
    setDeleteGuest(null);
  };

  const isCurrentGuest = (guest: Guest) => {
    const today = new Date();
    try {
      return isWithinInterval(today, {
        start: parseISO(guest.check_in_date),
        end: parseISO(guest.check_out_date),
      });
    } catch {
      return false;
    }
  };

  const isArrivalToday = (guest: Guest) => {
    try {
      return isToday(parseISO(guest.check_in_date));
    } catch {
      return false;
    }
  };

  const isDepartureToday = (guest: Guest) => {
    try {
      return isToday(parseISO(guest.check_out_date));
    } catch {
      return false;
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const inHouse = guests.filter(isCurrentGuest).length;
    const arrivals = guests.filter(isArrivalToday).length;
    const departures = guests.filter(isDepartureToday).length;
    return { inHouse, arrivals, departures };
  }, [guests]);

  // Filter guests
  const filteredGuests = useMemo(() => {
    let result = guests;

    // Apply filter
    switch (filter) {
      case 'in-house':
        result = result.filter(isCurrentGuest);
        break;
      case 'arrivals':
        result = result.filter(isArrivalToday);
        break;
      case 'departures':
        result = result.filter(isDepartureToday);
        break;
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(guest =>
        guest.full_name.toLowerCase().includes(searchLower) ||
        guest.room_number.toLowerCase().includes(searchLower) ||
        guest.booking_reference?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [guests, filter, search]);

  const getGuestStatus = (guest: Guest) => {
    if (isCurrentGuest(guest)) return { label: 'In-House', variant: 'confirmed' as const };
    const today = startOfDay(new Date());
    const checkIn = parseISO(guest.check_in_date);
    if (checkIn > today) return { label: 'Upcoming', variant: 'pending' as const };
    return { label: 'Checked Out', variant: 'secondary' as const };
  };

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Guests"
        description="Manage resort guests and their stays"
        action={
          <Button onClick={() => { setEditingGuest(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Guest
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Guests"
          value={guests.length}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="In-House Today"
          value={stats.inHouse}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="Arrivals Today"
          value={stats.arrivals}
          icon={ArrowUpRight}
          variant="success"
        />
        <StatCard
          title="Departures Today"
          value={stats.departures}
          icon={ArrowDownRight}
          variant="warning"
        />
      </div>

      {/* Filters and Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <FilterBar>
              <FilterBarGroup>
                <Select value={filter} onValueChange={(v) => setFilter(v as GuestFilter)}>
                  <SelectTrigger className="w-36 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="in-house">In-House</SelectItem>
                    <SelectItem value="arrivals">Arrivals Today</SelectItem>
                    <SelectItem value="departures">Departures Today</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBarGroup>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search name, room, or booking ref..."
                className="flex-1 max-w-sm"
              />
            </FilterBar>
          </div>

          {loading ? (
            <LoadingPage />
          ) : filteredGuests.length === 0 ? (
            <EmptyState
              icon={User}
              title={search || filter !== 'all' ? 'No guests found' : 'No guests yet'}
              description={search || filter !== 'all' ? 'Try adjusting your filters' : 'Add your first guest to get started'}
              action={
                !search && filter === 'all' && (
                  <Button onClick={() => { setEditingGuest(null); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Guest
                  </Button>
                )
              }
            />
          ) : (
            <DataTable
              data={filteredGuests}
              onRowClick={(guest) => navigate(`/guests/${guest.id}`)}
              columns={[
                {
                  header: 'Guest',
                  accessor: (guest) => (
                    <div>
                      <p className="font-medium text-foreground">{guest.full_name}</p>
                      {guest.email && (
                        <p className="text-sm text-muted-foreground">{guest.email}</p>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Room',
                  accessor: (guest) => (
                    <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {guest.room_number}
                    </span>
                  ),
                },
                {
                  header: 'Check-in',
                  accessor: (guest) => format(parseISO(guest.check_in_date), 'MMM d, yyyy'),
                },
                {
                  header: 'Check-out',
                  accessor: (guest) => format(parseISO(guest.check_out_date), 'MMM d, yyyy'),
                },
                {
                  header: 'Status',
                  accessor: (guest) => {
                    const status = getGuestStatus(guest);
                    return <Badge variant={status.variant}>{status.label}</Badge>;
                  },
                },
                {
                  header: 'Channel',
                  accessor: (guest) => guest.channel ? (
                    <Badge variant="outline">{guest.channel}</Badge>
                  ) : <span className="text-muted-foreground">-</span>,
                },
                {
                  header: '',
                  accessor: (guest) => (
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/guests/${guest.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingGuest(guest); setDialogOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteGuest(guest)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                  className: 'w-28',
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <GuestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        guest={editingGuest}
        resortId={currentResort.id}
        onSuccess={fetchGuests}
      />

      <AlertDialog open={!!deleteGuest} onOpenChange={() => setDeleteGuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteGuest?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
