import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Stat card skeleton with shimmer effect
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

// Multiple stat cards skeleton
export function StatCardGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={cn(
      'grid gap-4',
      count <= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-5',
      count === 6 && 'lg:grid-cols-6'
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-2">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            'h-4',
            i === 0 ? 'w-32' : i === columns - 1 ? 'w-16' : 'w-20'
          )} 
        />
      ))}
    </div>
  );
}

// Table skeleton with header
export function TableSkeleton({ rows = 3, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-4 py-3 px-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-3',
              i === 0 ? 'w-24' : i === columns - 1 ? 'w-14' : 'w-16'
            )} 
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

// Card with table skeleton
export function CardTableSkeleton({ 
  rows = 3, 
  columns = 5,
  showAction = true,
  className
}: { 
  rows?: number; 
  columns?: number;
  showAction?: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        {showAction && <Skeleton className="h-8 w-20" />}
      </CardHeader>
      <CardContent>
        <TableSkeleton rows={rows} columns={columns} />
      </CardContent>
    </Card>
  );
}

// Session/slot list item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

// Card with list skeleton
export function CardListSkeleton({ 
  rows = 5,
  showAction = true 
}: { 
  rows?: number;
  showAction?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        {showAction && <Skeleton className="h-8 w-20" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Request card skeleton (for pending requests)
export function RequestCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  );
}

// Card with request list skeleton
export function CardRequestsSkeleton({ 
  rows = 2 
}: { 
  rows?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-3 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Feedback item skeleton
export function FeedbackItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-4" />
            ))}
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton({ hasAction = false }: { hasAction?: boolean }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      {hasAction && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

// Quick actions skeleton
export function QuickActionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-10', i === 0 ? 'w-36' : 'w-32')} />
      ))}
    </div>
  );
}

// Full dashboard skeleton
export function DashboardSkeleton({ 
  statCount = 5,
  showQuickActions = true,
  layout = 'default' 
}: { 
  statCount?: number;
  showQuickActions?: boolean;
  layout?: 'default' | 'split';
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeaderSkeleton />
      {showQuickActions && <QuickActionsSkeleton />}
      <StatCardGridSkeleton count={statCount} />
      
      {layout === 'split' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <CardTableSkeleton rows={4} columns={6} className="lg:col-span-2" />
          <CardRequestsSkeleton rows={2} />
        </div>
      ) : (
        <>
          <CardTableSkeleton rows={4} columns={5} />
          <CardTableSkeleton rows={4} columns={6} />
        </>
      )}
    </div>
  );
}
