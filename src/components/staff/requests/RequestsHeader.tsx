import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface RequestsHeaderProps {
  onRefresh: () => void;
  isLoading?: boolean;
  totalCount?: number;
}

export function RequestsHeader({ onRefresh, isLoading, totalCount }: RequestsHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Guest Requests</h1>
          {totalCount !== undefined && totalCount > 0 && (
            <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {totalCount} active
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {format(new Date(), 'EEEE, MMMM d')} • Manage incoming service requests
        </p>
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        disabled={isLoading}
        className="h-9 self-start sm:self-auto"
      >
        <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}
