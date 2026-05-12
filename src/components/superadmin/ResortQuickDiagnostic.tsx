import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBeacon, getBeaconStatus } from './StatusBeacon';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Eye,
  ExternalLink,
  Calendar,
  Clock,
  UserCog,
} from 'lucide-react';

interface Resort {
  id: string;
  name: string;
  code: string;
  subscription_tier: string;
  status: string;
  is_demo: boolean;
}

interface ResortQuickDiagnosticProps {
  resort: Resort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullDrawer?: (resort: Resort) => void;
}

export function ResortQuickDiagnostic({ 
  resort, 
  open, 
  onOpenChange,
  onOpenFullDrawer,
}: ResortQuickDiagnosticProps) {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const today = new Date().toISOString().split('T')[0];

  // Fetch quick diagnostic data
  const { data, isLoading } = useQuery({
    queryKey: ['resort-quick-diagnostic', resort?.id],
    queryFn: async () => {
      if (!resort) return null;

      const [
        { count: staffCount },
        { data: recentErrors },
        { data: lastActivity },
      ] = await Promise.all([
        supabase.from('resort_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id),
        supabase.from('platform_errors')
          .select('id, error_message, severity, created_at')
          .eq('resort_id', resort.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('audit_logs')
          .select('created_at')
          .eq('resort_id', resort.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      return {
        staffCount: staffCount || 0,
        recentErrors: recentErrors || [],
        lastActivityTime: lastActivity?.[0]?.created_at || null,
      };
    },
    enabled: !!resort && open,
  });

  if (!resort) return null;

  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
  const beaconStatus = getBeaconStatus(data?.lastActivityTime);
  const hasErrors = (data?.recentErrors?.length || 0) > 0;

  const content = (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/30">
        <div className="flex items-center gap-3">
          <StatusBeacon status={beaconStatus} size="lg" />
          <div>
            <p className="font-medium text-sm">
              {beaconStatus === 'active' && 'Active'}
              {beaconStatus === 'idle' && 'Idle (1hr+)'}
              {beaconStatus === 'error' && 'No Activity'}
            </p>
            <p className="text-xs text-muted-foreground">
              {data?.lastActivityTime 
                ? `Last activity: ${format(new Date(data.lastActivityTime), 'MMM d, HH:mm')}`
                : 'No recent activity'
              }
            </p>
          </div>
        </div>
        <Badge className={tierInfo.color}>{tierInfo.name}</Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <UserCog className="h-4 w-4" />
            <span className="text-xs">Active Staff</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-xl font-bold">{data?.staffCount || 0}</p>
          )}
        </div>
        <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">Recent Errors</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className={cn(
              'text-xl font-bold',
              hasErrors && 'text-destructive'
            )}>
              {data?.recentErrors?.length || 0}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Recent Errors */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Recent Errors
        </h4>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : hasErrors ? (
          <ScrollArea className="h-[140px]">
            <div className="space-y-2">
              {data?.recentErrors?.map((error) => (
                <div 
                  key={error.id}
                  className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
                >
                  <p className="text-xs font-medium text-destructive line-clamp-1">
                    {error.error_message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(error.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center gap-2 p-4 bg-success/5 border border-success/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-sm text-success">No recent errors</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="flex flex-col gap-2">
        <Button 
          onClick={() => {
            onOpenChange(false);
            if (onOpenFullDrawer && resort) {
              onOpenFullDrawer(resort);
            }
          }}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          Full Diagnostics
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              navigate(`/superadmin/support?resort=${resort.id}`);
              onOpenChange(false);
            }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Support Mode
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open(`/guest/login?resort=${encodeURIComponent(resort.code)}`, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Guest Portal
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile: Bottom Drawer
  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {resort.name}
            </DrawerTitle>
            <DrawerDescription className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{resort.code}</Badge>
              {resort.is_demo && <Badge variant="outline" className="text-xs">DEMO</Badge>}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Side Sheet
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-hidden">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {resort.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{resort.code}</Badge>
            {resort.is_demo && <Badge variant="outline" className="text-xs">DEMO</Badge>}
            <span className="text-muted-foreground">• Quick Diagnostic</span>
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-140px)]">
          {content}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
