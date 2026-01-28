import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import { useRequestCatalog, useServiceRequestMutations, useGuestServiceRequests, CatalogItem } from '@/hooks/useServiceRequests';
import { RequestCategoryGrid, CategoryConfig } from '@/components/guest/requests/RequestCategoryGrid';
import { RequestCreateSheet } from '@/components/guest/requests/RequestCreateSheet';
import { MultiSelectItemGrid, SelectedItem } from '@/components/guest/requests/MultiSelectItemGrid';
import { RequestBundleSheet, BundleSubmitParams, MAX_BUNDLE_ITEMS, MAX_TOTAL_QUANTITY } from '@/components/guest/requests/RequestBundleSheet';
import { RequestModeSwitcher, RequestMode } from '@/components/guest/requests/RequestModeSwitcher';
import { PrearrivalRequestsBlockedState } from '@/components/guest/PrearrivalRequestsBlockedState';
import { SimpleRequestFlow } from '@/components/guest/requests/SimpleRequestFlow';
import { Button } from '@/components/ui/button';
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
import { Link } from 'react-router-dom';
import { ClipboardList, Sparkles, ArrowRight, X, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const { isPrearrival, daysUntilArrival } = useIsPrearrivalGuest();
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Multi-select mode state
  const [mode, setMode] = useState<RequestMode>('quick');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [bundleSheetOpen, setBundleSheetOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(
    guest?.resortId || '',
    !!guest?.resortId
  );

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

  const multiSelectMode = mode === 'multi';
  
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
  // This ensures requests route to FRONT_OFFICE for universal staff visibility
  if (!catalogLoading && !hasCatalog) {
    return (
      <SimpleRequestFlow
        guestId={guest.guestId}
        resortId={guest.resortId}
        resortTimezone={guest.resortTimezone}
      />
    );
  }

  const handleCategorySelect = (category: CategoryConfig) => {
    if (multiSelectMode) return; // Don't open sheet in multi-select mode
    setSelectedCategory(category);
    setSheetOpen(true);
  };

  const handleToggleItem = useCallback((item: CatalogItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.catalogId === item.id);
      if (existing) {
        // Always allow removing
        return prev.filter((i) => i.catalogId !== item.id);
      }
      
      // Check if adding would exceed limit
      if (prev.length >= MAX_BUNDLE_ITEMS) {
        toast.error(`Maximum ${MAX_BUNDLE_ITEMS} items per request`, {
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
  }, []);

  const handleUpdateQuantity = useCallback((catalogId: string, delta: number) => {
    setSelectedItems((prev) => {
      // Calculate new total quantity
      const currentTotal = prev.reduce((sum, item) => sum + item.quantity, 0);
      const targetItem = prev.find((item) => item.catalogId === catalogId);
      
      if (!targetItem) return prev;
      
      const newQuantity = Math.max(1, Math.min(10, targetItem.quantity + delta));
      const newTotal = currentTotal - targetItem.quantity + newQuantity;
      
      // Block increase if would exceed total limit
      if (delta > 0 && newTotal > MAX_TOTAL_QUANTITY) {
        toast.error(`Maximum ${MAX_TOTAL_QUANTITY} total items`, {
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
  }, []);

  const handleRemoveItem = useCallback((catalogId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.catalogId !== catalogId));
  }, []);

  const handleSubmitBundle = async (params: BundleSubmitParams) => {
    await createBundle({
      items: params.items.map((i) => ({ catalogId: i.catalogId, quantity: i.quantity })),
      isAsap: params.isAsap,
      requestedForAt: params.requestedForAt,
      guestNotes: params.guestNotes,
    });
    
    // Reset state
    setSelectedItems([]);
    setMode('quick');
    setBundleSheetOpen(false);
  };

  const handleModeChange = (newMode: RequestMode) => {
    if (newMode === 'quick' && selectedItems.length > 0) {
      // Show confirmation dialog
      setExitDialogOpen(true);
    } else {
      setMode(newMode);
      if (newMode === 'quick') {
        setSelectedItems([]);
      }
    }
  };

  const handleConfirmExit = () => {
    setSelectedItems([]);
    setMode('quick');
    setExitDialogOpen(false);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header with link to My Requests */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How can we help?
          </h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button variant="outline" size="sm" asChild className="gap-1.5 relative">
            <Link to="/guest/requests/my">
              <ClipboardList className="h-4 w-4" />
              My Requests
              {/* Active request count badge */}
              <AnimatePresence>
                {activeCount > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shadow-sm"
                  >
                    {activeCount > 9 ? '9+' : activeCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Mode Switcher - only show when catalog is configured */}
      {hasCatalog && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <RequestModeSwitcher
            mode={mode}
            onModeChange={handleModeChange}
          />
        </motion.div>
      )}

      {/* Category Grid or Multi-Select Grid */}
      <div id="request-content" role="tabpanel">
        {catalogLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="h-28 rounded-2xl animate-pulse bg-gradient-to-r from-muted via-muted/80 to-muted" 
              />
            ))}
          </div>
        ) : multiSelectMode ? (
          <motion.div
            key="multi-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <MultiSelectItemGrid
              items={catalogItems || []}
              selectedItems={selectedItems}
              onToggleItem={handleToggleItem}
              onUpdateQuantity={handleUpdateQuantity}
            />
          </motion.div>
        ) : (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RequestCategoryGrid onSelectCategory={handleCategorySelect} />
          </motion.div>
        )}
      </div>

      {/* Sticky bottom bar for multi-select */}
      <AnimatePresence>
        {multiSelectMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[calc(var(--guest-nav-h,72px)+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-4"
          >
            <div 
              className={cn(
                'rounded-2xl shadow-2xl p-4 transition-all duration-300',
                'backdrop-blur-xl border',
                selectedItems.length > 0 
                  ? 'bg-primary text-primary-foreground border-primary shadow-primary/30' 
                  : 'bg-background/95 text-foreground border-border shadow-black/10'
              )}
            >
              {selectedItems.length > 0 ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center"
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <motion.p 
                        key={totalSelectedCount}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-semibold"
                      >
                        {totalSelectedCount} item{totalSelectedCount !== 1 ? 's' : ''} selected
                      </motion.p>
                      <p className="text-xs text-primary-foreground/70">
                        {selectedItems.length} unique item{selectedItems.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 font-semibold min-h-[44px] px-4"
                    onClick={() => setBundleSheetOpen(true)}
                  >
                    Review & Send
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Tap items above to select
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground min-h-[44px]"
                    onClick={() => setMode('quick')}
                  >
                    <X className="h-4 w-4" />
                    Exit
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit confirmation dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear selected items?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected. 
              Switching modes will clear your selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Clear & Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Sheet (single item) */}
      <RequestCreateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedCategory}
        catalogItems={catalogItems || []}
        guestId={guest.guestId}
        resortId={guest.resortId}
        resortTimezone={guest.resortTimezone}
      />

      {/* Bundle Sheet (multi-item) */}
      <RequestBundleSheet
        open={bundleSheetOpen}
        onOpenChange={setBundleSheetOpen}
        selectedItems={selectedItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onSubmit={handleSubmitBundle}
        isSubmitting={isCreatingBundle}
      />
    </div>
  );
}
