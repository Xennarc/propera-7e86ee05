import { ClipboardList, Search, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RequestsEmptyStateProps {
  hasFilters: boolean;
  activeTab: string;
  onClearFilters: () => void;
}

export function RequestsEmptyState({ hasFilters, activeTab, onClearFilters }: RequestsEmptyStateProps) {
  const isCompleted = activeTab === 'COMPLETED';
  const isAllClear = activeTab === 'all' && !hasFilters;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/60 p-5 mb-5">
        {isAllClear ? (
          <CheckCircle className="h-10 w-10 text-success/60" />
        ) : hasFilters ? (
          <Search className="h-10 w-10 text-muted-foreground/40" />
        ) : (
          <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>
      
      <h3 className="text-lg font-medium text-foreground mb-2">
        {isAllClear 
          ? "You're all caught up!" 
          : hasFilters 
            ? 'No requests found' 
            : `No ${activeTab.toLowerCase().replace('_', ' ')} requests`}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {isAllClear
          ? "All requests have been handled. Great work!"
          : hasFilters 
            ? 'Try adjusting your filters to find what you\'re looking for.'
            : isCompleted
              ? 'Completed requests will appear here after resolution.'
              : 'New requests from guests will appear here.'}
      </p>
      
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
