import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, RefreshCw, AlertCircle, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { DashboardCounts } from '@/hooks/useRequestsDashboard';

interface DashboardHeaderProps {
  counts: DashboardCounts;
  lastSyncedAt: Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onShowShortcuts?: () => void;
}

export function DashboardHeader({
  counts,
  lastSyncedAt,
  onRefresh,
  isRefreshing,
  onShowShortcuts,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Requests Dashboard</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <span>
            Last updated {formatDistanceToNow(lastSyncedAt, { addSuffix: true })}
          </span>
          {counts.overdue > 0 && (
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <AlertCircle className="h-3 w-3" />
              {counts.overdue} overdue
            </Badge>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-1.5"
        >
          <Link to="/staff/guest-requests">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Inbox View</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {onShowShortcuts && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowShortcuts}
            className="gap-1.5 hidden md:flex"
          >
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </Button>
        )}
      </div>
    </div>
  );
}
