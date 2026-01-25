import * as React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { TierGate, TierBadge } from '@/components/tier/TierGate';
import { TierFeature } from '@/lib/tier-features';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  feature?: TierFeature;
  disabled?: boolean;
  disabledReason?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  href,
  feature,
  disabled = false,
  disabledReason,
  badge,
  className,
}: SettingsCardProps) {
  const cardContent = (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        "active:translate-y-0 active:shadow-sm",
        disabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0",
        className
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
            "bg-primary/10 group-hover:bg-primary/15 transition-colors"
          )}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium leading-tight">
                {title}
              </CardTitle>
              {feature && <TierBadge feature={feature} />}
              {badge}
            </div>
            <CardDescription className="text-xs line-clamp-2">
              {description}
            </CardDescription>
          </div>
        </div>
      </div>
    </Card>
  );

  // Disabled state with tooltip
  if (disabled) {
    if (disabledReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-not-allowed">{cardContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <div className="cursor-not-allowed">{cardContent}</div>;
  }

  // Feature-gated card
  if (feature) {
    return (
      <TierGate feature={feature} fallback="disabled">
        <Link to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
          {cardContent}
        </Link>
      </TierGate>
    );
  }

  // Regular clickable card
  return (
    <Link to={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
      {cardContent}
    </Link>
  );
}
