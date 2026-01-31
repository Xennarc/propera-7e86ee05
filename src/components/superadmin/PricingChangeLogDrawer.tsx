import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Clock, User, FileText, Send, Package, CreditCard } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface PricingLogEntry {
  id: string;
  actor_id: string;
  action: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
  // Joined user data
  user_name?: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  update_plan_price: { label: 'Plan Updated', icon: CreditCard, color: 'text-info' },
  update_addon_price: { label: 'Add-on Updated', icon: Package, color: 'text-primary' },
  publish_pricing: { label: 'Pricing Published', icon: Send, color: 'text-success' },
  default: { label: 'Action', icon: FileText, color: 'text-muted-foreground' },
};

export function PricingChangeLogDrawer() {
  const [open, setOpen] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['superadmin', 'pricing-change-log'],
    queryFn: async (): Promise<PricingLogEntry[]> => {
      const { data, error } = await supabase
        .from('pricing_publish_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch user names separately
      const entries = (data || []) as PricingLogEntry[];
      const actorIds = [...new Set(entries.map(e => e.actor_id))];
      
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', actorIds);

        const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        entries.forEach(e => {
          e.user_name = nameMap.get(e.actor_id) || 'System';
        });
      }

      return entries;
    },
    enabled: open,
    staleTime: 30 * 1000,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Change Log
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Pricing Change Log
          </SheetTitle>
          <SheetDescription>
            Recent changes to plans and add-on pricing.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-6 pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No changes yet</p>
              <p className="text-sm text-muted-foreground">
                Pricing changes will be logged here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.default;
                const Icon = config.icon;
                const metadata = log.metadata_json || {};

                return (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {/* Metadata summary */}
                        <div className="mt-2 text-sm">
                          {log.action === 'update_plan_price' && (
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">
                                {(metadata.plan_id as string)?.slice(0, 8)}...
                              </span>{' '}
                              → ${((metadata.monthly_price_cents as number) / 100).toLocaleString()} {metadata.currency as string}
                            </p>
                          )}
                          {log.action === 'update_addon_price' && (
                            <p className="text-muted-foreground">
                              <span className="text-foreground font-medium">
                                {metadata.name as string}
                              </span>{' '}
                              → ${((metadata.monthly_price_cents as number) / 100).toLocaleString()} {metadata.currency as string}
                            </p>
                          )}
                          {log.action === 'publish_pricing' && (
                            <p className="text-muted-foreground">
                              Published all pricing changes
                            </p>
                          )}
                        </div>

                        {/* Actor */}
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {log.user_name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
