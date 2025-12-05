import { getCategoryConfig, ActivityCategoryKey } from '@/lib/activity-category-config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: string | null | undefined;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * A consistent badge for displaying activity categories with their icons.
 */
export function CategoryBadge({
  category,
  showIcon = true,
  showLabel = true,
  size = 'sm',
  className,
}: CategoryBadgeProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };
  
  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        config.bgClass,
        config.colorClass,
        config.borderClass,
        textSizes[size],
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} className="shrink-0" />}
      {showLabel && <span>{config.shortLabel}</span>}
    </Badge>
  );
}

interface CategoryIconProps {
  category: string | null | undefined;
  size?: number;
  className?: string;
}

/**
 * Just the icon for a category, without the badge wrapper.
 */
export function CategoryIcon({
  category,
  size = 20,
  className,
}: CategoryIconProps) {
  const config = getCategoryConfig(category);
  const Icon = config.icon;
  
  return <Icon size={size} className={cn(config.colorClass, className)} />;
}

interface CategoryChipProps {
  category: ActivityCategoryKey | 'all';
  label?: string;
  isActive?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

/**
 * A clickable chip for category filters.
 */
export function CategoryChip({
  category,
  label,
  isActive = false,
  onClick,
  count,
  className,
}: CategoryChipProps) {
  const config = category === 'all' ? null : getCategoryConfig(category);
  const Icon = config?.icon;
  const displayLabel = label || (category === 'all' ? 'All' : config?.label);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 shrink-0',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/50',
        className
      )}
    >
      {Icon && <Icon size={18} className={isActive ? 'text-primary-foreground' : config?.colorClass} />}
      <span>{displayLabel}</span>
      {count !== undefined && (
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full',
          isActive ? 'bg-primary-foreground/20' : 'bg-muted'
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
