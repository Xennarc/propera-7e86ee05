import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ShoppingBag, Zap, Loader2, Settings2 } from 'lucide-react';

interface RequestsStickyBarProps {
  selectedCount: number;
  totalQuantity: number;
  onDirectSubmit: () => void;
  onReview: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export const RequestsStickyBar = memo(function RequestsStickyBar({
  selectedCount,
  totalQuantity,
  onDirectSubmit,
  onReview,
  isSubmitting = false,
  disabled = false,
}: RequestsStickyBarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <AnimatePresence>
      {hasSelection && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed left-0 right-0 z-40',
            'bottom-[calc(var(--guest-nav-h,72px)+env(safe-area-inset-bottom,0px))]',
            'px-4 pb-3'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 p-3',
              'rounded-2xl shadow-2xl',
              'bg-background/95 backdrop-blur-xl',
              'border border-border/60',
              'shadow-black/10 dark:shadow-black/30',
              // Gradient border effect
              'gradient-border-glow'
            )}
          >
            {/* Left: Selection summary */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-xl flex-shrink-0',
                  'bg-primary/10 flex items-center justify-center'
                )}
                animate={{ 
                  rotate: [0, -3, 3, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <ShoppingBag className="h-5 w-5 text-primary" />
              </motion.div>
              <div className="min-w-0">
                <motion.p
                  key={totalQuantity}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-semibold text-foreground text-sm"
                >
                  {totalQuantity} item{totalQuantity !== 1 ? 's' : ''} selected
                </motion.p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedCount} unique item{selectedCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Right: Submit button */}
            <Button
              onClick={onSubmit}
              disabled={disabled || isSubmitting || !hasSelection}
              size="default"
              className={cn(
                'gap-2 font-semibold min-h-[44px] px-5',
                'shadow-md shadow-primary/20',
                'active:scale-95 transition-transform duration-100'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="sr-only sm:not-sr-only">Sending...</span>
                </>
              ) : (
                <>
                  <span>Send request</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
