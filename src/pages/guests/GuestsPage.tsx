import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, User, Users, ArrowUpRight, ArrowDownRight, Building2, Eye, Crown, Star, Mail, Send, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GuestDialog } from './GuestDialog';
import { SendPrearrivalEmailDialog } from '@/components/guests/SendPrearrivalEmailDialog';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { FilterBar, FilterBarGroup } from '@/components/ui/filter-bar';
import { SearchInput } from '@/components/ui/search-input';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { StatCardGridSkeleton } from '@/components/ui/dashboard-skeletons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { isWithinInterval, isToday, startOfDay, addDays, isBefore, isAfter } from 'date-fns';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { safeFormatDate, safeParseDateISO } from '@/lib/safe-date-format';
import { usePrearrivalStatuses, GuestPrearrivalStatus } from '@/hooks/usePrearrivalStatus';
import { useQuery } from '@tanstack/react-query';

type GuestFilter = 'all' | 'in-house' | 'arrivals' | 'departures' | 'prearrival-pending';

function GuestsPageContent() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [emailTargetGuests, setEmailTargetGuests] = useState<Guest[]>([]);
  
  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if prearrival is enabled for this resort
  const { data: prearrivalSettings } = useQuery({
    queryKey: ['prearrival-settings', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return null;
      const { data, error } = await supabase
        .from('prearrival_settings')
        .select('is_enabled')
        .eq('resort_id', currentResort.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentResort,
  });

  const prearrivalEnabled = prearrivalSettings?.is_enabled ?? false;

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
    setSelectedGuests(new Set()); // Clear selection on resort change
  }, [currentResort]);

  // Fetch prearrival statuses for all guests
  const guestIds = useMemo(() => guests.map(g => g.id), [guests]);
  const { data: prearrivalStatuses } = usePrearrivalStatuses({
    guestIds,
    resortId: currentResort?.id || '',
    enabled: prearrivalEnabled && guestIds.length > 0,
  });

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
    const checkIn = safeParseDateISO(guest.check_in_date);
    const checkOut = safeParseDateISO(guest.check_out_date);
    if (!checkIn || !checkOut) return false;
    
    try {
      return isWithinInterval(today, { start: checkIn, end: checkOut });
    } catch {
      return false;
    }
  };

  const isArrivalToday = (guest: Guest) => {
    const checkIn = safeParseDateISO(guest.check_in_date);
    if (!checkIn) return false;
    return isToday(checkIn);
  };

  const isDepartureToday = (guest: Guest) => {
    const checkOut = safeParseDateISO(guest.check_out_date);
    if (!checkOut) return false;
    return isToday(checkOut);
  };

  const isFutureArrival = (guest: Guest) => {
    const checkIn = safeParseDateISO(guest.check_in_date);
    if (!checkIn) return false;
    return isAfter(checkIn, new Date());
  };

  const isArrivingInNext7Days = (guest: Guest) => {
    const checkIn = safeParseDateISO(guest.check_in_date);
    if (!checkIn) return false;
    const today = startOfDay(new Date());
    const in7Days = addDays(today, 7);
    return isAfter(checkIn, today) && isBefore(checkIn, in7Days);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const inHouse = guests.filter(isCurrentGuest).length;
    const arrivals = guests.filter(isArrivalToday).length;
    const departures = guests.filter(isDepartureToday).length;
    const pendingPrearrival = prearrivalEnabled 
      ? guests.filter(g => {
          const status = prearrivalStatuses?.[g.id];
          return isFutureArrival(g) && (!status?.prearrivalStatus || status.prearrivalStatus === 'not_started');
        }).length
      : 0;
    return { inHouse, arrivals, departures, pendingPrearrival };
  }, [guests, prearrivalStatuses, prearrivalEnabled]);

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
      case 'prearrival-pending':
        result = result.filter(g => {
          const status = prearrivalStatuses?.[g.id];
          return isArrivingInNext7Days(g) && (!status?.prearrivalStatus || status.prearrivalStatus !== 'completed');
        });
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
  }, [guests, filter, search, prearrivalStatuses]);

  const getGuestStatus = (guest: Guest) => {
    if (isCurrentGuest(guest)) return { label: 'In-House', variant: 'confirmed' as const };
    const today = startOfDay(new Date());
    const checkIn = safeParseDateISO(guest.check_in_date);
    if (checkIn && checkIn > today) return { label: 'Upcoming', variant: 'pending' as const };
    return { label: 'Checked Out', variant: 'secondary' as const };
  };

  const getPrearrivalBadge = (guestId: string) => {
    const status = prearrivalStatuses?.[guestId];
    if (!status) return null;

    switch (status.prearrivalStatus) {
      case 'completed':
        return <Badge variant="success" className="text-xs">Completed</Badge>;
      case 'partial':
        return <Badge variant="warning" className="text-xs">In Progress</Badge>;
      case 'not_started':
      default:
        return <Badge variant="outline" className="text-xs">Not Started</Badge>;
    }
  };

  const getInviteBadge = (guestId: string) => {
    const status = prearrivalStatuses?.[guestId];
    if (!status || status.inviteStatus === 'not_sent') return null;

    if (status.inviteStatus === 'sent') {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs text-success border-success/30">
              <Mail className="h-3 w-3 mr-1" />
              Sent
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Sent {status.lastInviteSent ? safeFormatDate(status.lastInviteSent, 'MMM d, h:mm a') : ''}
          </TooltipContent>
        </Tooltip>
      );
    }
    if (status.inviteStatus === 'failed') {
      return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    }
    return null;
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    } else {
      setSelectedGuests(new Set());
    }
  };

  const handleSelectGuest = (guestId: string, checked: boolean) => {
    const newSet = new Set(selectedGuests);
    if (checked) {
      newSet.add(guestId);
    } else {
      newSet.delete(guestId);
    }
    setSelectedGuests(newSet);
  };

  const isAllSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuests.has(g.id));
  const isSomeSelected = selectedGuests.size > 0;

  // Email actions
  const handleSendEmailSingle = (guest: Guest) => {
    setEmailTargetGuests([guest]);
    setSendEmailDialogOpen(true);
  };

  const handleSendEmailBulk = () => {
    const selected = guests.filter(g => selectedGuests.has(g.id));
    setEmailTargetGuests(selected);
    setSendEmailDialogOpen(true);
  };

  const canSendPrearrival = (guest: Guest) => {
    return prearrivalEnabled && isFutureArrival(guest);
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
      {loading ? (
        <StatCardGridSkeleton count={4} />
      ) : (
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
      )}

      {/* Filters and Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <FilterBar>
              <FilterBarGroup>
                <Select value={filter} onValueChange={(v) => setFilter(v as GuestFilter)}>
                  <SelectTrigger className="w-44 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="in-house">In-House</SelectItem>
                    <SelectItem value="arrivals">Arrivals Today</SelectItem>
                    <SelectItem value="departures">Departures Today</SelectItem>
                    {prearrivalEnabled && (
                      <SelectItem value="prearrival-pending">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Arriving Soon (7d)
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FilterBarGroup>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search name, room, or booking ref..."
                className="flex-1 max-w-sm"
              />
              {/* Bulk actions */}
              {isSomeSelected && prearrivalEnabled && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSendEmailBulk}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Pre-Arrival ({selectedGuests.size})
                </Button>
              )}
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
                // Selection checkbox
                ...(prearrivalEnabled ? [{
                  header: '',
                  accessor: (guest: Guest) => (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedGuests.has(guest.id)}
                        onCheckedChange={(checked) => handleSelectGuest(guest.id, !!checked)}
                        aria-label={`Select ${guest.full_name}`}
                      />
                    </div>
                  ),
                  className: 'w-12',
                }] : []),
                {
                  header: 'Guest',
                  accessor: (guest) => (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground">{guest.full_name}</p>
                          {guest.is_vip && (
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          )}
                          {guest.loyalty_tier && (
                            <Star className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        {guest.email && (
                          <p className="text-sm text-muted-foreground">{guest.email}</p>
                        )}
                      </div>
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
                  accessor: (guest) => safeFormatDate(guest.check_in_date, 'MMM d, yyyy'),
                },
                {
                  header: 'Check-out',
                  accessor: (guest) => safeFormatDate(guest.check_out_date, 'MMM d, yyyy'),
                },
                {
                  header: 'Status',
                  accessor: (guest) => {
                    const status = getGuestStatus(guest);
                    return <Badge variant={status.variant}>{status.label}</Badge>;
                  },
                },
                // Pre-arrival columns (only if enabled)
                ...(prearrivalEnabled ? [
                  {
                    header: 'Pre-Arrival',
                    accessor: (guest: Guest) => {
                      if (!isFutureArrival(guest)) return <span className="text-muted-foreground">-</span>;
                      return (
                        <div className="flex items-center gap-1.5">
                          {getPrearrivalBadge(guest.id)}
                          {getInviteBadge(guest.id)}
                        </div>
                      );
                    },
                  },
                ] : []),
                {
                  header: '',
                  accessor: (guest) => (
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Send Pre-Arrival button (only for future arrivals) */}
                      {canSendPrearrival(guest) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleSendEmailSingle(guest)}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send pre-arrival email</TooltipContent>
                        </Tooltip>
                      )}
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
                  className: 'w-36',
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

      {/* Send Pre-Arrival Email Dialog */}
      <SendPrearrivalEmailDialog
        open={sendEmailDialogOpen}
        onOpenChange={setSendEmailDialogOpen}
        guests={emailTargetGuests}
        onSuccess={() => {
          setSelectedGuests(new Set());
          fetchGuests();
        }}
      />
    </div>
  );
}

export default function GuestsPage() {
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <GuestsPageContent />
    </ErrorBoundary>
  );
}
