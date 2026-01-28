import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface RequestOptionChipProps {
  id: string;
  label: string;
  selected: boolean;
  quantity?: number;
  onToggle: () => void;
  disabled?: boolean;
}

export const RequestOptionChip = memo(function RequestOptionChip({
  label,
  selected,
  quantity = 1,
  onToggle,
  disabled = false,
}: RequestOptionChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      initial={false}
      animate={selected ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        // Base styles
        'relative inline-flex items-center gap-1.5 px-3.5 py-2.5',
        'rounded-full text-sm font-medium',
        'min-h-[44px] min-w-[44px]', // Touch target
        'transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Border and background states - enhanced shadows
        selected
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 border-2 border-primary'
          : 'bg-card/60 text-foreground border border-border/60 hover:border-primary/40 hover:bg-card/80 hover:shadow-sm'
      )}
      role="checkbox"
      aria-checked={selected}
      aria-label={`${label}${selected ? ', selected' : ''}`}
    >
      {/* Selection indicator with improved animation */}
      <motion.span
        initial={false}
        animate={{
          width: selected ? 18 : 0,
          opacity: selected ? 1 : 0,
          rotate: selected ? 0 : -90,
          marginRight: selected ? 2 : 0,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-center justify-center overflow-hidden"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.span>

      {/* Label with ellipsis */}
      <span className="truncate max-w-[140px] sm:max-w-[180px]">{label}</span>

      {/* Quantity badge */}
      {selected && quantity > 1 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            'ml-0.5 inline-flex items-center justify-center',
            'h-5 min-w-[20px] px-1.5 rounded-full',
            'text-[10px] font-bold',
            'bg-primary-foreground/20'
          )}
        >
          ×{quantity}
        </motion.span>
      )}
    </motion.button>
  );
});
