import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';

type SectionBadge = 'admin' | 'super-admin';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: SectionBadge;
  children: React.ReactNode;
  /** Force collapsible behavior even on desktop */
  collapsible?: boolean;
  /** Default open state for collapsible */
  defaultOpen?: boolean;
  className?: string;
}

const badgeStyles: Record<SectionBadge, string> = {
  'admin': 'bg-primary/10 text-primary border border-primary/20',
  'super-admin': 'bg-destructive/10 text-destructive border border-destructive/20',
};

const badgeLabels: Record<SectionBadge, string> = {
  'admin': 'Admin',
  'super-admin': 'Super Admin',
};

export function SettingsSection({
  title,
  description,
  icon: Icon,
  badge,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: SettingsSectionProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  
  const shouldCollapse = collapsible || isMobile;

  const headerContent = (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
          badge === 'super-admin' ? 'bg-destructive/10' : 'bg-primary/10'
        )}>
          <Icon className={cn(
            "h-4.5 w-4.5",
            badge === 'super-admin' ? 'text-destructive' : 'text-primary'
          )} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          {badge && (
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0",
              badgeStyles[badge]
            )}>
              {badgeLabels[badge]}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (shouldCollapse) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("space-y-4", className)}
      >
        <CollapsibleTrigger className="w-full text-left group">
          <div className="flex items-center justify-between py-2">
            {headerContent}
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="py-2">
        {headerContent}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
