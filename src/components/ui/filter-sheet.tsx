import { ReactNode, useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  activeCount?: number;
  onClear?: () => void;
  children: ReactNode;
}

/**
 * Mobile-optimized filter sheet that slides up from bottom.
 * On desktop, this renders as a popover/inline - parent should handle that.
 */
export function FilterSheet({
  open,
  onOpenChange,
  title = 'Filters',
  activeCount = 0,
  onClear,
  children,
}: FilterSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
          <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
          <div className="flex items-center gap-2">
            {activeCount > 0 && onClear && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
        
        <DrawerFooter className="px-4 py-4 border-t bg-background">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Apply Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs bg-primary-foreground/20 text-primary-foreground">
                {activeCount}
              </Badge>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface FilterTriggerProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}

/**
 * Filter trigger button for mobile - shows icon and active count badge
 */
export function FilterTrigger({ onClick, activeCount = 0, className }: FilterTriggerProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      className={cn('relative shrink-0 h-11 w-11', className)}
      aria-label={`Filters${activeCount > 0 ? `, ${activeCount} active` : ''}`}
    >
      <Filter className="h-4 w-4" />
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      )}
    </Button>
  );
}

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Section within filter sheet with title
 */
export function FilterSection({ title, children, className }: FilterSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

/**
 * Divider between filter sections
 */
export function FilterDivider() {
  return <Separator className="my-4" />;
}
