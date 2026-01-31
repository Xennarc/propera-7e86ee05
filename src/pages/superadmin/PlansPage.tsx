import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useResort } from '@/contexts/ResortContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowRight,
  ToggleRight,
  Settings,
  AlertCircle,
  Building2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { SubscriptionTier, getTierInfo } from '@/lib/tier-features';

const TIER_ORDER: SubscriptionTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'];

export default function PlansPage() {
  const { resorts } = useResort();

  // Aggregate tier distribution stats
  const { data: tierStats, isLoading } = useQuery({
    queryKey: ['superadmin', 'plan-stats'],
    queryFn: async () => {
      const { data: allResorts, error } = await supabase
        .from('resorts')
        .select('id, name, subscription_tier, subscription_started_at, subscription_expires_at, is_demo')
        .order('subscription_tier');

      if (error) throw error;

      const distribution: Record<string, number> = {
        ESSENTIAL: 0,
        PROFESSIONAL: 0,
        ELITE: 0,
      };

      let expiringSoon = 0;
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (const resort of allResorts || []) {
        const tier = resort.subscription_tier || 'ESSENTIAL';
        if (distribution[tier] !== undefined) {
          distribution[tier]++;
        }
        
        if (resort.subscription_expires_at) {
          const expiresAt = new Date(resort.subscription_expires_at);
          if (expiresAt <= thirtyDaysFromNow && expiresAt > now) {
            expiringSoon++;
          }
        }
      }

      return {
        distribution,
        total: allResorts?.length || 0,
        expiringSoon,
        demoCount: allResorts?.filter(r => r.is_demo).length || 0,
      };
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            Plans & Billing
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription tiers and billing configuration
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Platform Billing Status
          </CardTitle>
          <CardDescription>
            Pricing configuration and subscription expiration alerts will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-background border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Building2 className="h-4 w-4" />
                  Total Resorts
                </div>
                <p className="text-2xl font-bold">{tierStats?.total || 0}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-background border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Active Paid
                </div>
                <p className="text-2xl font-bold">
                  {(tierStats?.distribution.PROFESSIONAL || 0) + (tierStats?.distribution.ELITE || 0)}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-background border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  Expiring Soon
                </div>
                <p className="text-2xl font-bold text-warning">{tierStats?.expiringSoon || 0}</p>
              </div>
              
              <div className="p-4 rounded-xl bg-background border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Settings className="h-4 w-4" />
                  Demo Resorts
                </div>
                <p className="text-2xl font-bold text-muted-foreground">{tierStats?.demoCount || 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tier Distribution</CardTitle>
          <CardDescription>
            Current breakdown of resorts by subscription tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {TIER_ORDER.map(tier => {
                const info = getTierInfo(tier);
                const count = tierStats?.distribution[tier] || 0;
                const percentage = tierStats?.total ? Math.round((count / tierStats.total) * 100) : 0;
                
                return (
                  <div key={tier} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${
                          tier === 'ELITE' ? 'bg-primary/10 text-primary border-primary/30' :
                          tier === 'PROFESSIONAL' ? 'bg-info/10 text-info border-info/30' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {info.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{info.description}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            tier === 'ELITE' ? 'bg-primary' :
                            tier === 'PROFESSIONAL' ? 'bg-info' :
                            'bg-muted-foreground'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Links</CardTitle>
          <CardDescription>
            Jump to related management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/staff/settings/subscriptions">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Tier Management</p>
                    <p className="text-sm text-muted-foreground">Change resort subscription tiers</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
            
            <Link to="/superadmin/feature-flags">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <ToggleRight className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium">Feature Flags</p>
                    <p className="text-sm text-muted-foreground">Control features by tier and resort</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
