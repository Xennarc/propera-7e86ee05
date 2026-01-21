import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useRequestCatalog } from '@/hooks/useServiceRequests';
import { RequestCategoryGrid, CategoryConfig } from '@/components/guest/requests/RequestCategoryGrid';
import { RequestCreateSheet } from '@/components/guest/requests/RequestCreateSheet';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(
    guest?.resortId || '',
    !!guest?.resortId
  );

  if (!guest) return null;

  const handleCategorySelect = (category: CategoryConfig) => {
    setSelectedCategory(category);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
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
            Select a category to make a request
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

      {/* Helpful tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> Need something right away? 
              Select <span className="font-medium">"As soon as possible"</span> and our team will prioritize your request.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Grid */}
      {catalogLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <RequestCategoryGrid onSelectCategory={handleCategorySelect} />
        </motion.div>
      )}

      {/* Create Sheet */}
      <RequestCreateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedCategory}
        catalogItems={catalogItems || []}
        guestId={guest.guestId}
        resortId={guest.resortId}
        resortTimezone={guest.resortTimezone}
      />
    </div>
  );
}
