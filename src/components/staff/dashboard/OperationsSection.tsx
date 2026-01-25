import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronRight, ChevronDown, Clock } from 'lucide-react';

interface OperationsSectionProps {
  /** Section title */
  title: string;
  /** Title icon */
  icon: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** View all link */
  viewAllHref: string;
  /** Loading state */
  loading?: boolean;
  /** Empty state content */
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  /** Children list items */
  children?: ReactNode;
  /** Whether section has items */
  hasItems?: boolean;
  /** Additional className */
  className?: string;
  /** Collapsible on mobile */
  collapsibleMobile?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Operations section card for activity/restaurant lists.
 * Premium styling with clear hierarchy and mobile optimization.
 */
export function OperationsSection({
  title,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  viewAllHref,
  loading = false,
  emptyIcon: EmptyIcon,
  emptyMessage = 'Nothing scheduled',
  children,
  hasItems = true,
  className,
  collapsibleMobile = false,
  defaultCollapsed = false,
}: OperationsSectionProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  const content = (
    <>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 sm:h-12 rounded-lg" />
          ))}
        </div>
      ) : hasItems ? (
        <div className="space-y-2 max-h-80 overflow-auto">
          {children}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-6">
          {EmptyIcon && (
            <EmptyIcon className="h-10 w-10 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground/40" />
          )}
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </>
  );

  // Mobile collapsible version
  if (collapsibleMobile) {
    return (
      <Card className={className}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-foreground transition-colors sm:pointer-events-none">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
                  {title}
                </CardTitle>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform sm:hidden",
                  isOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link to={viewAllHref} className="text-primary">
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          
          <CollapsibleContent className="sm:block">
            <CardContent className="pt-0">
              {content}
              {/* Mobile view all button */}
              <Button 
                variant="ghost" 
                size="sm" 
                asChild 
                className="w-full mt-3 sm:hidden text-primary"
              >
                <Link to={viewAllHref}>
                  View all <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // Default non-collapsible
  return (
    <Card className={className}>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to={viewAllHref} className="text-primary">
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}

interface OperationsListItemProps {
  /** Item link destination */
  href: string;
  /** Time display */
  time: string;
  /** Main title */
  title: string;
  /** Capacity info: "confirmed/total" */
  capacity?: string;
  /** Occupancy percentage */
  occupancy?: number;
  /** Optional badge (e.g., meal period) */
  badge?: {
    label: string;
    className?: string;
  };
  /** Additional className */
  className?: string;
}

/**
 * List item for operations sections.
 * Mobile-optimized with stacked layout on small screens.
 */
export function OperationsListItem({
  href,
  time,
  title,
  capacity,
  occupancy,
  badge,
  className,
}: OperationsListItemProps) {
  const getOccupancyVariant = (pct?: number) => {
    if (!pct) return 'secondary';
    if (pct >= 80) return 'destructive';
    if (pct >= 50) return 'default';
    return 'secondary';
  };

  return (
    <Link
      to={href}
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between",
        "p-4 sm:p-3 rounded-xl sm:rounded-lg",
        "bg-muted/30 hover:bg-muted/60 transition-colors group",
        "active:scale-[0.99]",
        className
      )}
    >
      {/* Left: Time + Title + Badge */}
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Clock className="h-4 w-4" />
          <span className="font-mono text-sm">{time}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="font-medium text-sm sm:text-sm group-hover:text-primary transition-colors truncate">
            {title}
          </span>
          {badge && (
            <Badge className={cn("text-[11px] shrink-0", badge.className)}>
              {badge.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Right: Capacity + Occupancy */}
      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 pl-9 sm:pl-0">
        {capacity && (
          <span className="text-sm text-muted-foreground">{capacity}</span>
        )}
        {occupancy !== undefined && (
          <Badge variant={getOccupancyVariant(occupancy)} className="text-xs shrink-0">
            {occupancy}%
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors hidden sm:block" />
      </div>
    </Link>
  );
}
