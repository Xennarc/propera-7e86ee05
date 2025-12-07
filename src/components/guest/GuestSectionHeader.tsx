import { Link } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComponentType, ReactNode } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

interface GuestSectionHeaderProps {
  title: string;
  count?: number;
  icon?: ReactNode | ComponentType<IconProps>;
  iconClassName?: string;
  iconBgClassName?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function GuestSectionHeader({
  title,
  count,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  actionLabel,
  actionHref,
  onAction,
  className,
}: GuestSectionHeaderProps) {
  // Render icon - handle both component and ReactNode
  const renderIcon = () => {
    if (!Icon) return null;
    
    // If it's a component (function), render it
    if (typeof Icon === 'function') {
      const IconComponent = Icon as ComponentType<IconProps>;
      return (
        <div className={cn("p-1.5 rounded-lg", iconBgClassName || "bg-primary/10")}>
          <IconComponent className={cn("h-4 w-4", iconClassName || "text-primary")} />
        </div>
      );
    }
    
    // If it's already a ReactNode, just render it
    return Icon;
  };

  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-center gap-2">
        {renderIcon()}
        <h2 className="font-semibold text-foreground">
          {title}
          {count !== undefined && (
            <span className={cn("ml-1.5", iconClassName || "text-primary")}>
              ({count})
            </span>
          )}
        </h2>
      </div>
      
      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Link 
            to={actionHref}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors tap-target"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors tap-target"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
}
