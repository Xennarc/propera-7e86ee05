import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  MessageSquarePlus,
  ClipboardList,
  Search,
  Calendar,
  UtensilsCrossed,
  Plus,
  Zap,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary';
}

interface MobileQuickOpsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchOpen?: () => void;
}

export function MobileQuickOps({ open, onOpenChange, onSearchOpen }: MobileQuickOpsProps) {
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      id: 'search',
      label: 'Search Guests',
      description: 'Find guest by name or room',
      icon: Search,
      onClick: () => {
        onOpenChange(false);
        onSearchOpen?.();
      },
      variant: 'primary',
    },
    {
      id: 'add-guest',
      label: 'Add Guest',
      description: 'Register a new guest',
      icon: UserPlus,
      href: '/staff/guests?action=add',
    },
    {
      id: 'create-request',
      label: 'New Request',
      description: 'Create a service request',
      icon: MessageSquarePlus,
      href: '/staff/guest-requests?action=new',
    },
    {
      id: 'pending-requests',
      label: 'Pending Requests',
      description: 'View requests needing action',
      icon: ClipboardList,
      href: '/staff/guest-requests?filter=new',
    },
    {
      id: 'new-session',
      label: 'New Activity Session',
      description: 'Schedule an activity',
      icon: Calendar,
      href: '/staff/activities/sessions/new',
    },
    {
      id: 'new-dining-slot',
      label: 'New Dining Slot',
      description: 'Open a restaurant slot',
      icon: UtensilsCrossed,
      href: '/staff/restaurants/slots/new',
    },
  ];

  const handleAction = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    } else if (action.href) {
      navigate(action.href);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-auto max-h-[85vh] rounded-t-3xl bg-card dark:bg-midnight-900 border-border/30 pb-safe"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 pb-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.variant === 'primary';
            
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className={cn(
                  // 48px+ touch targets with generous padding
                  "flex flex-col items-start justify-center gap-1.5 p-4 min-h-[80px] rounded-2xl border",
                  "transition-all duration-200 active:scale-[0.97] text-left",
                  isPrimary
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/30 border-border/30 dark:bg-midnight-800/50 dark:border-midnight-700/50"
                )}
              >
                <Icon className={cn("h-5 w-5", isPrimary && "text-primary")} />
                <div>
                  <span className={cn(
                    "text-sm font-medium leading-tight block",
                    isPrimary && "text-primary"
                  )}>
                    {action.label}
                  </span>
                  <span className="text-2xs text-muted-foreground leading-tight">
                    {action.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * FAB trigger for quick ops - can be used on individual pages
 */
export function QuickOpsFAB({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "fixed bottom-20 right-4 z-40 lg:hidden",
        "h-14 w-14 rounded-2xl shadow-lg",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "transition-all duration-200 active:scale-95",
        className
      )}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
