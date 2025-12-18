import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { useState, useEffect, memo } from 'react';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Delay in ms before showing spinner (prevents flash for fast loads) */
  delay?: number;
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export const LoadingSpinner = memo(function LoadingSpinner({ 
  className, 
  size = 'md', 
  delay = 0 
}: LoadingSpinnerProps) {
  const [showSpinner, setShowSpinner] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShowSpinner(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!showSpinner) return null;

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-primary/30 border-t-primary',
          sizeClasses[size]
        )}
      />
    </div>
  );
});

interface LoadingPageProps {
  /** Delay before showing (default 150ms to prevent flash) */
  delay?: number;
  /** Optional text to show */
  text?: string;
  /** Reserve minimum height to prevent layout shift */
  minHeight?: string;
}

export const LoadingPage = memo(function LoadingPage({ 
  delay = 150,
  text = 'Loading...',
  minHeight = '200px'
}: LoadingPageProps) {
  const [showContent, setShowContent] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = setTimeout(() => setShowContent(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Always reserve space to prevent layout shift
  return (
    <div 
      className="flex flex-col items-center justify-center py-16 gap-4"
      style={{ minHeight }}
    >
      {showContent && (
        <>
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        </>
      )}
    </div>
  );
});

// Enhanced page loading with skeleton structure
export const PageLoadingSkeleton = memo(function PageLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton - fixed height */}
      <div className="space-y-1" style={{ minHeight: '52px' }}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {/* Stats skeleton - fixed height grid */}
      <div 
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        style={{ minHeight: '100px' }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 h-[100px]">
            <div className="flex items-center justify-between h-full">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Table skeleton - fixed height */}
      <div className="rounded-xl border bg-card" style={{ minHeight: '400px' }}>
        <div className="p-4 border-b">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
});

// Compact list loading skeleton
export const ListLoadingSkeleton = memo(function ListLoadingSkeleton({ 
  rows = 5,
  rowHeight = 64 
}: { 
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <div className="space-y-2" style={{ minHeight: `${rows * (rowHeight + 8)}px` }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full" style={{ height: rowHeight }} />
      ))}
    </div>
  );
});
