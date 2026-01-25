import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Search } from 'lucide-react';

interface ActivitiesEmptyStateProps {
  hasSearch: boolean;
  hasCategory: boolean;
  onAddActivity: () => void;
  onClearFilters: () => void;
  isReadOnly?: boolean;
}

export function ActivitiesEmptyState({
  hasSearch,
  hasCategory,
  onAddActivity,
  onClearFilters,
  isReadOnly = false,
}: ActivitiesEmptyStateProps) {
  const isFiltered = hasSearch || hasCategory;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted/60 p-5 mb-5">
        {isFiltered ? (
          <Search className="h-10 w-10 text-muted-foreground/40" />
        ) : (
          <Sparkles className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>
      
      <h3 className="text-lg font-medium text-foreground mb-2">
        {isFiltered ? 'No activities found' : 'No activities yet'}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {isFiltered 
          ? 'Try adjusting your search or filters to find what you\'re looking for.'
          : 'Create your first activity to start managing bookings and sessions.'}
      </p>
      
      {isFiltered ? (
        <Button variant="outline" onClick={onClearFilters}>
          Clear filters
        </Button>
      ) : !isReadOnly && (
        <Button onClick={onAddActivity}>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Activity
        </Button>
      )}
    </div>
  );
}
