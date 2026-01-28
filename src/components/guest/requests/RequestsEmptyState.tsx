import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Bell, RefreshCw } from 'lucide-react';

interface RequestsEmptyStateProps {
  onRetry?: () => void;
  isError?: boolean;
  errorMessage?: string;
}

export const RequestsEmptyState = memo(function RequestsEmptyState({
  onRetry,
  isError = false,
  errorMessage,
}: RequestsEmptyStateProps) {
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          'p-8 rounded-2xl',
          'bg-destructive/5 border border-destructive/20'
        )}
      >
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <RefreshCw className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Something went wrong
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[240px]">
          {errorMessage || "We couldn't load the request options. Please try again."}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6 rounded-2xl',
        'bg-gradient-to-br from-primary/5 via-transparent to-primary/5',
        'border border-border/40'
      )}
    >
      {/* Icon cluster */}
      <div className="relative mb-5">
        <motion.div
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-7 w-7 text-primary" />
        </motion.div>
        <motion.div
          className="absolute -right-2 -top-1 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        Your personal concierge
      </h3>
      <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
        We're setting up your request options. In the meantime, our team is here to help with anything you need.
      </p>
    </motion.div>
  );
});

export const RequestsLoadingSkeleton = memo(function RequestsLoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading request options">
      {/* Category skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-2xl border border-border/50 p-4',
            'bg-card/40 backdrop-blur-sm'
          )}
        >
          <div className="flex items-center gap-3">
            {/* Icon skeleton */}
            <div className="w-9 h-9 rounded-full bg-muted/60 animate-pulse" />
            {/* Text skeletons */}
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-24 bg-muted/60 rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted/40 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
