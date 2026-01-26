import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HorizontalCardCarouselProps {
  /** Section title */
  title: string;
  /** Icon to display next to title */
  icon?: React.ReactNode;
  /** Link to view all items */
  viewAllHref?: string;
  /** Whether to show on mobile only (desktop renders children normally) */
  mobileOnly?: boolean;
  /** Children cards */
  children: ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether there are items to show */
  hasItems?: boolean;
  /** Additional className for container */
  className?: string;
}

/**
 * Horizontal scrolling card carousel for mobile dashboards.
 * Uses native CSS snap scrolling for smooth, battery-efficient scrolling.
 * On tablet+, falls back to a grid layout.
 */
export function HorizontalCardCarousel({
  title,
  icon,
  viewAllHref,
  mobileOnly = true,
  children,
  emptyMessage = 'No items',
  hasItems = true,
  className,
}: HorizontalCardCarouselProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {viewAllHref && (
          <Button variant="ghost" size="sm" asChild className="text-primary -mr-2">
            <Link to={viewAllHref}>
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {/* Content */}
      {hasItems ? (
        <>
          {/* Mobile: Horizontal carousel */}
          <div className={cn(
            mobileOnly ? "block md:hidden" : "block",
            "carousel-container"
          )}>
            <div className="carousel-scroll">
              {children}
            </div>
          </div>

          {/* Tablet+: Grid layout (only when mobileOnly) */}
          {mobileOnly && (
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {children}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-xl">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}
