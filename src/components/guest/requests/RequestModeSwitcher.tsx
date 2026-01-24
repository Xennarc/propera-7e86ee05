import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Zap, ListChecks } from 'lucide-react';

type RequestMode = 'quick' | 'multi';

interface RequestModeSwitcherProps {
  mode: RequestMode;
  onModeChange: (mode: RequestMode) => void;
  disabled?: boolean;
}

const FIRST_VISIT_KEY = 'propera_multiselect_hint_shown';

export function RequestModeSwitcher({ 
  mode, 
  onModeChange,
  disabled = false 
}: RequestModeSwitcherProps) {
  const [showPulse, setShowPulse] = useState(false);

  // First-time hint animation
  useEffect(() => {
    const hasSeenHint = localStorage.getItem(FIRST_VISIT_KEY);
    if (!hasSeenHint) {
      // Delay the pulse animation
      const timer = setTimeout(() => {
        setShowPulse(true);
        // Mark as shown after animation
        setTimeout(() => {
          localStorage.setItem(FIRST_VISIT_KEY, 'true');
          setShowPulse(false);
        }, 2000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Segmented Control */}
      <div 
        className={cn(
          'relative flex p-1 rounded-full bg-muted/60 backdrop-blur-sm border border-border/50',
          'shadow-sm',
          disabled && 'opacity-50 pointer-events-none'
        )}
        role="tablist"
        aria-label="Request mode"
      >
        {/* Animated background pill */}
        <motion.div
          className="absolute inset-y-1 rounded-full bg-background shadow-md border border-border/50"
          initial={false}
          animate={{
            left: mode === 'quick' ? '4px' : '50%',
            right: mode === 'quick' ? '50%' : '4px',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />

        {/* Quick mode button */}
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'quick'}
          aria-controls="request-content"
          className={cn(
            'relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5',
            'text-sm font-medium rounded-full transition-colors duration-200',
            'min-h-[44px]', // Thumb-friendly
            mode === 'quick' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground/80'
          )}
          onClick={() => onModeChange('quick')}
        >
          <Zap className="h-4 w-4" />
          <span>Quick</span>
        </button>

        {/* Multiple mode button */}
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'multi'}
          aria-controls="request-content"
          className={cn(
            'relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5',
            'text-sm font-medium rounded-full transition-colors duration-200',
            'min-h-[44px]', // Thumb-friendly
            mode === 'multi' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground/80'
          )}
          onClick={() => onModeChange('multi')}
        >
          <ListChecks className="h-4 w-4" />
          <span>Multiple</span>
          
          {/* First-time pulse animation */}
          {showPulse && mode === 'quick' && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.8, 1, 1.1, 1.2],
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.2, 0.6, 1],
                repeat: 1,
              }}
            />
          )}
        </button>
      </div>

      {/* Helper microcopy */}
      <motion.p
        key={mode}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-xs text-muted-foreground text-center px-2"
      >
        {mode === 'quick' 
          ? 'Tap an item to request instantly.' 
          : 'Select items, then send once.'}
      </motion.p>
    </div>
  );
}

export type { RequestMode };
