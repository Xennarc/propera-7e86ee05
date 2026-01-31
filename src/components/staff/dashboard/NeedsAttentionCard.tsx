import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  ChevronRight, 
  MessageSquare, 
  Users, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface AttentionItem {
  id: string;
  type: 'request' | 'vip_arrival' | 'full_session' | 'low_feedback';
  title: string;
  subtitle: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

interface NeedsAttentionCardProps {
  /** Open guest requests */
  openRequests?: Array<{
    id: string;
    guestName: string;
    roomNumber: string;
    requestText: string;
    status: string;
  }>;
  /** VIP arrivals today */
  vipArrivals?: Array<{
    id: string;
    name: string;
    roomNumber: string;
  }>;
  /** Fully booked sessions */
  fullySessions?: number;
  /** Loading state */
  loading?: boolean;
  /** Enable sticky positioning on mobile */
  sticky?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * "Needs Attention" card that answers: "What should I act on right now?"
 * Always shows first on mobile for quick prioritization.
 */
export function NeedsAttentionCard({
  openRequests = [],
  vipArrivals = [],
  fullySessions = 0,
  loading = false,
  sticky = false,
  className,
}: NeedsAttentionCardProps) {
  // Sticky classes for mobile
  const stickyClasses = sticky 
    ? "md:static md:top-auto md:z-auto sticky top-16 z-20 sticky-shadow" 
    : "";
  // Build attention items list
  const attentionItems: AttentionItem[] = [];

  // Add open requests (high priority)
  openRequests.slice(0, 3).forEach(req => {
    attentionItems.push({
      id: `req-${req.id}`,
      type: 'request',
      title: req.guestName,
      subtitle: req.requestText.slice(0, 50) + (req.requestText.length > 50 ? '...' : ''),
      href: '/staff/requests-dashboard',
      priority: 'high',
    });
  });

  // Add VIP arrivals (medium priority)
  vipArrivals.slice(0, 2).forEach(vip => {
    attentionItems.push({
      id: `vip-${vip.id}`,
      type: 'vip_arrival',
      title: `VIP: ${vip.name}`,
      subtitle: `Room ${vip.roomNumber}`,
      href: `/staff/guests/${vip.id}`,
      priority: 'medium',
    });
  });

  // Add fully booked sessions alert
  if (fullySessions > 0) {
    attentionItems.push({
      id: 'full-sessions',
      type: 'full_session',
      title: `${fullySessions} fully booked session${fullySessions > 1 ? 's' : ''}`,
      subtitle: 'May need overflow handling',
      href: '/staff/activities/sessions',
      priority: 'medium',
    });
  }

  const totalItems = openRequests.length + vipArrivals.length + (fullySessions > 0 ? 1 : 0);
  const hasItems = attentionItems.length > 0;

  const getItemIcon = (type: AttentionItem['type']) => {
    switch (type) {
      case 'request': return MessageSquare;
      case 'vip_arrival': return Users;
      case 'full_session': return Calendar;
      default: return AlertTriangle;
    }
  };

  const getPriorityStyles = (priority: AttentionItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className={cn("border-warning/30", stickyClasses, className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // All clear state
  if (!hasItems) {
    return (
      <Card className={cn("border-success/30 bg-success/5", stickyClasses, className)}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground">
              No urgent items need your attention right now.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-warning/30", stickyClasses, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            Needs Attention
            <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning/20">
              {totalItems}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {attentionItems.map(item => {
            const ItemIcon = getItemIcon(item.type);
            return (
              <Link
                key={item.id}
                to={item.href}
                className="flex items-center gap-3 p-3 sm:p-3 rounded-xl sm:rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors group active:scale-[0.99]"
              >
                <div className={cn(
                  "h-9 w-9 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center shrink-0",
                  getPriorityStyles(item.priority)
                )}>
                  <ItemIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* View all link if there are more items */}
        {openRequests.length > 3 && (
          <Button 
            variant="ghost" 
            size="sm" 
            asChild 
            className="w-full mt-3 text-primary"
          >
            <Link to="/staff/requests-dashboard">
              View all {openRequests.length} requests <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
