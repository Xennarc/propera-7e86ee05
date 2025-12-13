import { cn } from '@/lib/utils';
import { Crown, Star, Award, Gem } from 'lucide-react';

interface LoyaltyTierBadgeProps {
  tierName: string;
  badgeColor?: string;
  badgeIcon?: string | null;
  isElite?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  crown: Crown,
  star: Star,
  award: Award,
  gem: Gem,
};

export function LoyaltyTierBadge({
  tierName,
  badgeColor = '#6B7280',
  badgeIcon,
  isElite = false,
  size = 'md',
  className,
}: LoyaltyTierBadgeProps) {
  const Icon = badgeIcon ? iconMap[badgeIcon] || Star : Star;
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full text-white shadow-sm',
        isElite && 'ring-2 ring-amber-400/50',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: badgeColor }}
    >
      <Icon className={iconSizes[size]} />
      {tierName}
    </span>
  );
}
