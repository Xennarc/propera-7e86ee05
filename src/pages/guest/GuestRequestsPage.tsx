import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useRequestCatalog, useServiceRequestMutations, CatalogItem } from '@/hooks/useServiceRequests';
import { RequestCategoryGrid, CategoryConfig } from '@/components/guest/requests/RequestCategoryGrid';
import { RequestCreateSheet } from '@/components/guest/requests/RequestCreateSheet';
import { MultiSelectItemGrid, SelectedItem } from '@/components/guest/requests/MultiSelectItemGrid';
import { RequestBundleSheet, BundleSubmitParams, MAX_BUNDLE_ITEMS, MAX_TOTAL_QUANTITY } from '@/components/guest/requests/RequestBundleSheet';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, Sparkles, ListChecks, X, ArrowRight, Package, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Multi-select mode state
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [bundleSheetOpen, setBundleSheetOpen] = useState(false);
  
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(
    guest?.resortId || '',
    !!guest?.resortId
  );

  const { createBundle, isCreatingBundle } = useServiceRequestMutations(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  // Total selected item count
  const totalSelectedCount = useMemo(() => 
    selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );

  if (!guest) return null;

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
    setMultiSelectMode(false);
    setBundleSheetOpen(false);
  };

  const toggleMultiSelectMode = () => {
    if (multiSelectMode) {
      // Exiting multi-select mode
      setSelectedItems([]);
    }
    setMultiSelectMode(!multiSelectMode);
  };

  return (
    <div className="space-y-6 pb-24">
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
          <p className="text-sm text-muted-foreground">
            {multiSelectMode ? 'Select items to request' : 'Select a category to make a request'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to="/guest/requests/my">
              <ClipboardList className="h-4 w-4" />
              My Requests
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Multi-select toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Button
          variant={multiSelectMode ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'gap-2 transition-all',
            multiSelectMode && 'ring-2 ring-primary ring-offset-2 shadow-md'
          )}
          onClick={toggleMultiSelectMode}
        >
          {multiSelectMode ? (
            <>
              <X className="h-4 w-4" />
              Exit Multi-Select
            </>
          ) : (
            <>
              <ListChecks className="h-4 w-4" />
              Select Multiple
            </>
          )}
        </Button>
      </motion.div>

      {/* Helpful tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">
              {multiSelectMode ? (
                <>
                  <span className="font-medium text-foreground">Tip:</span>{' '}
                  Tap items to select, then use the bottom bar to submit. We'll route to the right teams automatically.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Tip:</span> Need something right away? 
                  Select <span className="font-medium">"As soon as possible"</span> and our team will prioritize your request.
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Grid or Multi-Select Grid */}
      {catalogLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
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
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <RequestCategoryGrid onSelectCategory={handleCategorySelect} />
        </motion.div>
      )}

      {/* Sticky bottom bar for multi-select */}
      <AnimatePresence>
        {multiSelectMode && selectedItems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[calc(var(--guest-nav-h,72px)+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4 pb-4"
          >
            <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {totalSelectedCount} item{totalSelectedCount !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-primary-foreground/70">
                      {selectedItems.length} unique item{selectedItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 font-semibold"
                  onClick={() => setBundleSheetOpen(true)}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
