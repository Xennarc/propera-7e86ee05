import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import { useRequestCatalog, useServiceRequestMutations, useGuestServiceRequests, CatalogItem } from '@/hooks/useServiceRequests';
import { useRequestSettings } from '@/hooks/useRequestSettings';
import { RequestsHeader } from '@/components/guest/requests/RequestsHeader';
import { RequestCategoryAccordion } from '@/components/guest/requests/RequestCategoryAccordion';
import { RequestNotesCard } from '@/components/guest/requests/RequestNotesCard';
import { RequestsStickyBar } from '@/components/guest/requests/RequestsStickyBar';
import { RequestsEmptyState, RequestsLoadingSkeleton } from '@/components/guest/requests/RequestsEmptyState';
import { RequestBundleSheet, BundleSubmitParams } from '@/components/guest/requests/RequestBundleSheet';
import { PrearrivalRequestsBlockedState } from '@/components/guest/PrearrivalRequestsBlockedState';
import { SimpleRequestFlow } from '@/components/guest/requests/SimpleRequestFlow';
import { SelectedItem } from '@/components/guest/requests/MultiSelectItemGrid';
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
import { cn } from '@/lib/utils';

export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const { isPrearrival, daysUntilArrival } = useIsPrearrivalGuest();
  
  // Multi-select state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [bundleSheetOpen, setBundleSheetOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  const { data: catalogItems, isLoading: catalogLoading, error: catalogError, refetch } = useRequestCatalog(
    guest?.resortId || '',
    !!guest?.resortId
  );

  // Fetch dynamic settings
  const { settings } = useRequestSettings(guest?.resortId || '', !!guest?.resortId);

  const { createBundle, isCreatingBundle } = useServiceRequestMutations(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  // Fetch active requests for badge
  const { requests } = useGuestServiceRequests({
    guestId: guest?.guestId || '',
    resortId: guest?.resortId || '',
    enabled: !!guest,
  });
  
  const activeCount = useMemo(() => 
    requests.filter(r => 
      ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)
    ).length,
    [requests]
  );

  // Total selected item count
  const totalSelectedCount = useMemo(() => 
    selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );
  
  // Detect if resort has configured catalog
  const hasCatalog = !catalogLoading && catalogItems && catalogItems.length > 0;

  if (!guest) return null;

  // Show blocked state for pre-arrival guests
  if (isPrearrival) {
    return (
      <PrearrivalRequestsBlockedState 
        checkInDate={guest.checkInDate} 
        daysUntilArrival={daysUntilArrival} 
      />
    );
  }

  // No catalog configured = show simplified request flow
  if (!catalogLoading && !hasCatalog && !catalogError) {
    return (
      <SimpleRequestFlow
        guestId={guest.guestId}
        resortId={guest.resortId}
        resortTimezone={guest.resortTimezone}
      />
    );
  }

  const handleToggleItem = (item: CatalogItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.catalogId === item.id);
      if (existing) {
        // Always allow removing
        return prev.filter((i) => i.catalogId !== item.id);
      }
      
      // Check if adding would exceed limit (using dynamic settings)
      if (prev.length >= settings.maxBundleItems) {
        toast.error(`Maximum ${settings.maxBundleItems} items per request`, {
          description: 'Remove an item before adding more.',
        });
        return prev;
      }
      
      return [...prev, {
        catalogId: item.id,
        title: item.title,
        quantity: 1,
        category: item.category,
        departmentKey: item.department_key,
      }];
    });
  };

  const handleUpdateQuantity = useCallback((catalogId: string, delta: number) => {
    setSelectedItems((prev) => {
      // Calculate new total quantity
      const currentTotal = prev.reduce((sum, item) => sum + item.quantity, 0);
      const targetItem = prev.find((item) => item.catalogId === catalogId);
      
      if (!targetItem) return prev;
      
      const newQuantity = Math.max(1, Math.min(10, targetItem.quantity + delta));
      const newTotal = currentTotal - targetItem.quantity + newQuantity;
      
      // Block increase if would exceed total limit (using dynamic settings)
      if (delta > 0 && newTotal > settings.maxTotalQuantity) {
        toast.error(`Maximum ${settings.maxTotalQuantity} total items`, {
          description: 'Reduce quantities elsewhere first.',
        });
        return prev;
      }
      
      return prev.map((item) =>
        item.catalogId === catalogId
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  }, [settings.maxTotalQuantity]);

  const handleRemoveItem = useCallback((catalogId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.catalogId !== catalogId));
  }, []);

  const handleSubmitBundle = async (params: BundleSubmitParams) => {
    await createBundle({
      items: params.items.map((i) => ({ catalogId: i.catalogId, quantity: i.quantity })),
      isAsap: params.isAsap,
      requestedForAt: params.requestedForAt,
      guestNotes: params.guestNotes || notes.trim() || undefined,
    });
    
    // Reset state
    setSelectedItems([]);
    setNotes('');
    setBundleSheetOpen(false);
  };

  const handleOpenReview = () => {
    setBundleSheetOpen(true);
  };

  return (
    <div className={cn(
      'space-y-5',
      // Use extended safe bottom when sticky bar is visible
      selectedItems.length > 0 && 'guest-safe-bottom-extended'
    )}>
      {/* Header - with dynamic tagline */}
      <RequestsHeader activeCount={activeCount} tagline={settings.headerTagline} />

      {/* Main content */}
      <main>
        {catalogLoading ? (
          <RequestsLoadingSkeleton />
        ) : catalogError ? (
          <RequestsEmptyState 
            isError 
            errorMessage="We couldn't load the request options."
            onRetry={() => refetch()}
            title={settings.emptyStateTitle}
            description={settings.emptyStateDescription}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Category accordion */}
            <RequestCategoryAccordion
              items={catalogItems || []}
              selectedItems={selectedItems}
              onToggleItem={handleToggleItem}
            />

            {/* Notes card - only show when items selected */}
            {selectedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <RequestNotesCard
                  notes={notes}
                  onNotesChange={setNotes}
                  expanded={notesExpanded}
                  onExpandedChange={setNotesExpanded}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </main>

      {/* Sticky bottom action bar */}
      <RequestsStickyBar
        selectedCount={selectedItems.length}
        totalQuantity={totalSelectedCount}
        onSubmit={handleOpenReview}
        isSubmitting={isCreatingBundle}
        disabled={selectedItems.length === 0}
      />

      {/* Bundle Sheet (review + submit) - with dynamic settings */}
      <RequestBundleSheet
        open={bundleSheetOpen}
        onOpenChange={setBundleSheetOpen}
        selectedItems={selectedItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onSubmit={handleSubmitBundle}
        isSubmitting={isCreatingBundle}
        maxBundleItems={settings.maxBundleItems}
        maxTotalQuantity={settings.maxTotalQuantity}
        requestsStartHour={settings.requestsStartHour}
        requestsEndHour={settings.requestsEndHour}
      />
    </div>
  );
}
