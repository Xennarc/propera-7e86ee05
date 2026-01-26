import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GuestDialog } from './GuestDialog';
import { SendPrearrivalEmailDialog } from '@/components/guests/SendPrearrivalEmailDialog';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { StatCardGridSkeleton } from '@/components/ui/dashboard-skeletons';
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
import { isAfter } from 'date-fns';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { safeParseDateISO } from '@/lib/safe-date-format';
import { usePrearrivalStatuses } from '@/hooks/usePrearrivalStatus';
import { usePrearrivalListRealtime } from '@/hooks/usePrearrivalRealtime';
import { useQuery } from '@tanstack/react-query';
import { useGuestsQuery } from '@/hooks/useGuestsQuery';
import { useGuestMutations } from '@/hooks/useGuestMutations';
import { supabase } from '@/integrations/supabase/client';
import { useDemoReadOnly } from '@/hooks/useDemoReadOnly';
import { DemoReadOnlyBanner } from '@/components/demo/DemoReadOnlyBanner';
import { DemoActionWrapper } from '@/components/ui/demo-action-wrapper';

// New components
import { GuestsSummaryStrip } from '@/components/guests/GuestsSummaryStrip';
import { GuestListToolbar } from '@/components/guests/GuestListToolbar';
import { GuestRow } from '@/components/guests/GuestRow';
import { GuestCardRow } from '@/components/guests/GuestCardRow';
import { GuestPreviewDrawer } from '@/components/guests/GuestPreviewDrawer';
import { GuestBulkActionBar } from '@/components/guests/GuestBulkActionBar';
import { useGuestFilters, LegacyGuestFilter } from '@/hooks/useGuestFilters';
import { useGuestListPreferences } from '@/hooks/useGuestListPreferences';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

function GuestsPageContent() {
  const { isReadOnly } = useDemoReadOnly();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [sendEmailDialogOpen, setSendEmailDialogOpen] = useState(false);
  const [emailTargetGuests, setEmailTargetGuests] = useState<Guest[]>([]);
  const [previewGuest, setPreviewGuest] = useState<Guest | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const { currentResort, loading: resortLoading } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // CRITICAL: Safely extract resortId and resortCode - never use currentResort.* directly
  // These are the SINGLE sources of truth for resort scoping in this component
  const resortId: string | undefined = currentResort?.id;
  const resortCode: string | undefined = currentResort?.code;

  // Debug logging for null resort issues (single-fire)
  const hasLoggedNullWarning = useRef(false);
  useEffect(() => {
    if (!currentResort && !resortLoading && !hasLoggedNullWarning.current) {
      hasLoggedNullWarning.current = true;
      console.warn('[GuestsPage] currentResort is null after loading', {
        resortLoading,
        hasResortId: !!resortId,
        pathname: window.location.pathname,
      });
    }
    // Reset when resort becomes available
    if (currentResort) {
      hasLoggedNullWarning.current = false;
    }
  }, [currentResort, resortLoading, resortId]);

  // UI preferences
  const { preferences, toggleDensity } = useGuestListPreferences();

  // CRITICAL: All data hooks must be gated by !!resortId
  // Never pass empty string as resortId - it's a bug, not a fallback
  
  // Use React Query for guests - enables instant sync
  const { data: guests = [], isLoading: loading } = useGuestsQuery({
    resortId,
    enabled: !!resortId,
  });

  // Use mutations hook for delete
  const { deleteGuest: deleteGuestMutation } = useGuestMutations();

  // Check if prearrival is enabled for this resort
  const { data: prearrivalSettings } = useQuery({
    queryKey: ['prearrival-settings', resortId ?? '__no_resort__'],
    queryFn: async () => {
      // Double-check resortId is valid before querying
      if (!resortId) {
        console.warn('[GuestsPage] prearrivalSettings queryFn called without resortId');
        return null;
      }
      const { data, error } = await supabase
        .from('prearrival_settings')
        .select('is_enabled')
        .eq('resort_id', resortId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!resortId,
  });

  const prearrivalEnabled = prearrivalSettings?.is_enabled ?? false;

  // Enable real-time updates for prearrival statuses
  usePrearrivalListRealtime();

  // Fetch prearrival statuses for all guests
  // CRITICAL: Only compute guestIds when guests array is valid and resortId exists
  const guestIds = useMemo(() => {
    if (!resortId || !guests) return [];
    return guests.map(g => g.id);
  }, [guests, resortId]);
  
  const { data: prearrivalStatuses } = usePrearrivalStatuses({
    guestIds,
    resortId: resortId ?? '', // Hook internally checks for empty string
    enabled: prearrivalEnabled && guestIds.length > 0 && !!resortId,
  });

  // Use new filter hook
  const {
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
    isFutureArrival,
  } = useGuestFilters(guests, prearrivalStatuses, prearrivalEnabled);

  const handleDelete = async () => {
    // CRITICAL: Use resortId (the extracted safe variable), not currentResort.id
    if (!deleteGuest || !resortId) return;
    
    deleteGuestMutation.mutate(
      { guestId: deleteGuest.id, resortId },
      {
        onSuccess: () => {
          setDeleteGuest(null);
        },
        onError: () => {
          setDeleteGuest(null);
        },
      }
    );
  };

  // Selection handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    } else {
      setSelectedGuests(new Set());
    }
  }, [filteredGuests]);

  const handleSelectGuest = useCallback((guestId: string, checked: boolean) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(guestId);
      } else {
        newSet.delete(guestId);
      }
      return newSet;
    });
  }, []);

  const selectedGuestsList = useMemo(() => 
    guests.filter(g => selectedGuests.has(g.id)),
    [guests, selectedGuests]
  );

  // Email actions
  const handleSendEmailSingle = useCallback((guest: Guest) => {
    setEmailTargetGuests([guest]);
    setSendEmailDialogOpen(true);
  }, []);

  const handleSendEmailBulk = useCallback(() => {
    setEmailTargetGuests(selectedGuestsList);
    setSendEmailDialogOpen(true);
  }, [selectedGuestsList]);

  // Preview drawer handlers
  const handleOpenPreview = useCallback((guest: Guest) => {
    setPreviewGuest(guest);
    setPreviewOpen(true);
  }, []);

  const handleNavigateToDetail = useCallback((guest: Guest) => {
    navigate(`/guests/${guest.id}`);
  }, [navigate]);

  const handleEditGuest = useCallback((guest: Guest) => {
    setEditingGuest(guest);
    setDialogOpen(true);
    setPreviewOpen(false);
  }, []);

  const canSendPrearrival = useCallback((guest: Guest) => {
    return prearrivalEnabled && isFutureArrival(guest);
  }, [prearrivalEnabled, isFutureArrival]);

  // Show loading skeleton while resort context is loading
  if (resortLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Guests"
          description="Manage resort guests and their stays"
        />
        <StatCardGridSkeleton count={5} />
        <Card>
          <CardContent className="p-8">
            <LoadingPage />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if no resort (user has no memberships)
  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground">Please select a resort first</p>
          <p className="text-sm text-muted-foreground/70">
            If you don't see any resorts, contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = filteredGuests.length > 0 && filteredGuests.every(g => selectedGuests.has(g.id));
  const someSelected = selectedGuests.size > 0;

  return (
    <div className="space-y-6 animate-fade-in overflow-x-auto w-full max-w-full">
      {isReadOnly && <DemoReadOnlyBanner />}
      
      <PageHeader
        title="Guests"
        description="Manage resort guests and their stays"
        action={
          <DemoActionWrapper isReadOnly={isReadOnly} tooltipText="Creating guests is disabled in demo mode">
            <Button onClick={() => { if (!resortId) return; setEditingGuest(null); setDialogOpen(true); }} disabled={isReadOnly}>
              <Plus className="mr-2 h-4 w-4" />
              Add Guest
            </Button>
          </DemoActionWrapper>
        }
      />

      {/* Summary Strip */}
      {loading ? (
        <StatCardGridSkeleton count={5} />
      ) : (
        <GuestsSummaryStrip
          stats={stats}
          activeFilter={filters.legacyFilter}
          onFilterChange={setLegacyFilter}
        />
      )}

      {/* Filters and List */}
      <Card className="overflow-x-auto overflow-y-visible w-full">
        <CardContent className="p-0 overflow-x-auto overflow-y-visible">
          {/* Toolbar */}
          <div className="p-3 sm:p-4 border-b border-border/50">
            <GuestListToolbar
              search={filters.search}
              onSearchChange={setSearch}
              legacyFilter={filters.legacyFilter}
              onLegacyFilterChange={setLegacyFilter}
              statusFilters={filters.statusFilters}
              onStatusFiltersChange={setStatusFilters}
              flagFilters={filters.flagFilters}
              onFlagFiltersChange={setFlagFilters}
              sortBy={filters.sortBy}
              onSortChange={setSortBy}
              density={preferences.density}
              onDensityToggle={toggleDensity}
              prearrivalEnabled={prearrivalEnabled}
              stats={stats}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clearFilters}
            />
          </div>

          {loading ? (
            <LoadingPage />
          ) : filteredGuests.length === 0 ? (
            <EmptyState
              icon={User}
              title={hasActiveFilters ? 'No guests found' : 'No guests yet'}
              description={hasActiveFilters ? 'Try adjusting your filters' : 'Add your first guest to get started'}
              action={
                !hasActiveFilters && !isReadOnly && (
                  <Button onClick={() => { if (!resortId) return; setEditingGuest(null); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Guest
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop: Table-like rows */}
              {!isMobile && (
                <div className="overflow-x-hidden w-full">
                  {/* Header row */}
                  <div className={cn(
                    'grid gap-3 items-center border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground',
                    preferences.density === 'compact' ? 'py-2 px-3' : 'py-3 px-4',
                    prearrivalEnabled 
                      ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]' 
                      : 'grid-cols-[1fr_auto_auto_auto_auto_auto]'
                  )}>
                    {prearrivalEnabled && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    )}
                    <span>Guest</span>
                    <span>Room</span>
                    <span>Status</span>
                    <span>Dates</span>
                    {prearrivalEnabled && <span>Flags</span>}
                    <span className="text-right">Actions</span>
                  </div>

                  {/* Guest rows */}
                  <div className="divide-y divide-border/30">
                    {filteredGuests
                      .filter((guest): guest is Guest => guest != null && !!guest.id)
                      .map(guest => (
                        <GuestRow
                          key={guest.id}
                          guest={guest}
                          prearrivalStatus={prearrivalStatuses?.[guest.id]}
                          isSelected={selectedGuests.has(guest.id)}
                          onSelect={(checked) => handleSelectGuest(guest.id, checked)}
                          onPreview={() => handleOpenPreview(guest)}
                          onNavigate={() => handleNavigateToDetail(guest)}
                          onEdit={() => handleEditGuest(guest)}
                          onDelete={() => setDeleteGuest(guest)}
                          onSendEmail={canSendPrearrival(guest) ? () => handleSendEmailSingle(guest) : undefined}
                          showSelection={prearrivalEnabled}
                          showPrearrival={prearrivalEnabled}
                          isCompact={preferences.density === 'compact'}
                          isReadOnly={isReadOnly}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Mobile: Card rows */}
              {isMobile && (
                <div className="w-full overflow-x-auto">
                  <div className="p-3 space-y-3 pb-24 min-w-full">
                    {filteredGuests
                      .filter((guest): guest is Guest => guest != null && !!guest.id)
                      .map(guest => (
                        <GuestCardRow
                          key={guest.id}
                          guest={guest}
                          prearrivalStatus={prearrivalStatuses?.[guest.id]}
                          isSelected={selectedGuests.has(guest.id)}
                          onSelect={(checked) => handleSelectGuest(guest.id, checked)}
                          onPreview={() => handleOpenPreview(guest)}
                          onNavigate={() => handleNavigateToDetail(guest)}
                          showSelection={prearrivalEnabled}
                          showPrearrival={prearrivalEnabled}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
                Showing {filteredGuests.length} of {guests.length} guests
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      <GuestBulkActionBar
        selectedGuests={selectedGuestsList}
        onClearSelection={() => setSelectedGuests(new Set())}
        onSendPrearrival={someSelected && prearrivalEnabled ? handleSendEmailBulk : undefined}
        prearrivalEnabled={prearrivalEnabled}
      />

      {/* Preview Drawer */}
      <GuestPreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        guest={previewGuest}
        prearrivalStatus={previewGuest ? prearrivalStatuses?.[previewGuest.id] : undefined}
        onEdit={() => previewGuest && handleEditGuest(previewGuest)}
        onNavigateToDetail={() => previewGuest && handleNavigateToDetail(previewGuest)}
        onSendEmail={previewGuest && canSendPrearrival(previewGuest) ? () => handleSendEmailSingle(previewGuest) : undefined}
        prearrivalEnabled={prearrivalEnabled}
        isFutureArrival={previewGuest ? isFutureArrival(previewGuest) : false}
        isReadOnly={isReadOnly}
      />

      {resortId && resortCode && (
        <GuestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          guest={editingGuest}
          resortId={resortId}
          resortCode={resortCode}
          onSuccess={() => {
            // React Query will auto-refetch via invalidation
          }}
        />
      )}

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
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteGuestMutation.isPending}
            >
              {deleteGuestMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Pre-Arrival Email Dialog */}
      {resortId && (
        <SendPrearrivalEmailDialog
          open={sendEmailDialogOpen}
          onOpenChange={setSendEmailDialogOpen}
          guests={emailTargetGuests}
          onSuccess={() => {
            setSelectedGuests(new Set());
          }}
        />
      )}
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
