import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface GuestLoadingSkeletonProps {
  variant?: 'card' | 'list' | 'page' | 'booking';
  count?: number;
  className?: string;
  /** Delay before showing skeleton (prevents flash on fast loads) */
  delay?: number;
}

export function GuestLoadingSkeleton({
  variant = 'card',
  count = 3,
  className,
  delay = 200,
}: GuestLoadingSkeletonProps) {
  const [show, setShow] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!show) return null;

  if (variant === 'page') {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Page header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0 shimmer" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-6 w-40 shimmer" />
            <Skeleton className="h-4 w-56 shimmer" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl shimmer" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 shimmer" />
          <Skeleton className="h-24 w-full rounded-xl shimmer" />
          <Skeleton className="h-24 w-full rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  if (variant === 'booking') {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0 shimmer" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 shimmer" />
              <Skeleton className="h-3 w-1/2 shimmer" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0 shimmer" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 shimmer" />
              <Skeleton className="h-3 w-1/3 shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl shimmer" />
      ))}
    </div>
  );
}

// Specialized loading states
export function GuestHomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting card */}
      <Skeleton className="h-36 w-full rounded-2xl" />
      
      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      
      {/* Today's schedule */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function GuestActivitiesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Category pills */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
        ))}
      </div>
      
      {/* Date picker */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* Activity cards */}
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function GuestRestaurantsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Restaurant filter */}
      <Skeleton className="h-12 w-full rounded-xl" />
      
      {/* Date picker */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      {/* Meal period sections */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function GuestBookingsLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      {/* Filter tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-20 rounded-xl" />
      </div>
      
      {/* Summary card */}
      <Skeleton className="h-20 w-full rounded-xl" />
      
      {/* Section header */}
      <Skeleton className="h-5 w-28" />
      
      {/* Booking cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
            <Skeleton className="h-10 w-full" />
            <div className="p-4 flex gap-3">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
