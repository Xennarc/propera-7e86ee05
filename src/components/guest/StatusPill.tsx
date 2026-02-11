import { cn } from '@/lib/utils';
import { Check, Clock, X, AlertCircle, Eye, Loader2, LucideIcon } from 'lucide-react';

type StatusVariant = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show' | 'active' | 'default';

interface StatusPillProps {
  /** Text label to display */
  label: string;
  /** Visual variant */
  variant?: StatusVariant;
  /** Size */
  size?: 'sm' | 'default';
  /** Custom icon override */
  icon?: LucideIcon;
  className?: string;
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; icon: LucideIcon }> = {
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: Check },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: Check },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: Clock },
  active: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: Loader2 },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', icon: X },
  no_show: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Eye },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', icon: AlertCircle },
};

/**
 * Standardized status pill for the Guest Portal.
 * Always includes icon + label for accessibility (not color-only).
 */
export function StatusPill({
  label,
  variant = 'default',
  size = 'default',
  icon: CustomIcon,
  className,
}: StatusPillProps) {
  const config = variantStyles[variant] || variantStyles.default;
  const Icon = CustomIcon || config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        config.bg,
        config.text,
        size === 'sm'
          ? "text-[10px] px-2 py-0.5"
          : "text-xs px-2.5 py-1",
        className
      )}
    >
      <Icon className={cn(
        "shrink-0",
        size === 'sm' ? "h-2.5 w-2.5" : "h-3 w-3",
        variant === 'active' && "animate-spin"
      )} />
      {label}
    </span>
  );
}

/** Helper to map common booking status strings to StatusPill props */
export function bookingStatusToVariant(status: string): { variant: StatusVariant; label: string } {
  switch (status) {
    case 'CONFIRMED': return { variant: 'confirmed', label: 'Confirmed' };
    case 'PENDING': return { variant: 'pending', label: 'Pending' };
    case 'CANCELLED': return { variant: 'cancelled', label: 'Cancelled' };
    case 'COMPLETED': return { variant: 'completed', label: 'Completed' };
    case 'NO_SHOW': return { variant: 'no_show', label: 'No show' };
    default: return { variant: 'default', label: status };
  }
}
