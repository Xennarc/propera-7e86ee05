import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useRequestCatalog } from '@/hooks/useServiceRequests';
import { Button } from '@/components/ui/button';
import { RequestCategoryGrid, CategoryConfig } from '@/components/guest/requests/RequestCategoryGrid';
import { RequestCreateSheet } from '@/components/guest/requests/RequestCreateSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';

export default function GuestRequestsPage() {
  const { guest } = useGuestAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const { data: catalogItems, isLoading: catalogLoading } = useRequestCatalog(
    guest?.resortId || '',
    !!guest?.resortId
  );

  if (!guest) return null;

  const handleSelectCategory = (category: CategoryConfig) => {
    setSelectedCategory(category);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Make a Request</h1>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link to="/guest/requests/my">
            <ClipboardList className="h-4 w-4" />
            My Requests
          </Link>
        </Button>
      </div>

      {catalogLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <RequestCategoryGrid onSelectCategory={handleSelectCategory} />
      )}

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
