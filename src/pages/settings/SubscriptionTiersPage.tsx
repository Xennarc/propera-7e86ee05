import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Crown, Building2, Sparkles, Check } from 'lucide-react';
import { SubscriptionTier, getTierInfo } from '@/lib/tier-features';
import { format } from 'date-fns';

export default function SubscriptionTiersPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

  // Fetch all resorts with subscription info
  const { data: resorts, isLoading } = useQuery({
    queryKey: ['resorts-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, code, status, is_demo, subscription_tier, subscription_started_at, subscription_expires_at, created_at')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin(),
  });

  // Update subscription tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ resortId, tier }: { resortId: string; tier: SubscriptionTier }) => {
      const { error } = await supabase
        .from('resorts')
        .update({
          subscription_tier: tier,
          subscription_started_at: new Date().toISOString(),
        })
        .eq('id', resortId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resorts-subscriptions'] });
      toast.success('Subscription tier updated');
    },
    onError: (error) => {
      toast.error('Failed to update tier: ' + error.message);
    },
  });

  if (!isSuperAdmin()) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Crown}
          title="Access Denied"
          description="Only Super Admins can manage subscription tiers."
        />
      </div>
    );
  }

  // Filter resorts
  const filteredResorts = resorts?.filter((resort) => {
    const matchesSearch =
      resort.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resort.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === 'all' || resort.subscription_tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'ESSENTIAL':
        return <Building2 className="h-4 w-4" />;
      case 'PROFESSIONAL':
        return <Crown className="h-4 w-4" />;
      case 'ELITE':
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getTierBadgeClass = (tier: SubscriptionTier) => {
    switch (tier) {
      case 'ESSENTIAL':
        return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
      case 'PROFESSIONAL':
        return 'bg-teal-500/10 text-teal-600 border-teal-500/30';
      case 'ELITE':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    }
  };

  // Stats
  const tierCounts = {
    ESSENTIAL: resorts?.filter((r) => r.subscription_tier === 'ESSENTIAL').length || 0,
    PROFESSIONAL: resorts?.filter((r) => r.subscription_tier === 'PROFESSIONAL').length || 0,
    ELITE: resorts?.filter((r) => r.subscription_tier === 'ELITE').length || 0,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Subscription Tiers"
        description="Manage subscription tiers for all resorts"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as SubscriptionTier[]).map((tier) => {
          const info = getTierInfo(tier);
          return (
            <Card key={tier} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {info.name}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${info.color} bg-opacity-20`}>
                    {getTierIcon(tier)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{tierCounts[tier]}</div>
                <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Resorts</CardTitle>
          <CardDescription>
            Click on a tier to change a resort's subscription level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resorts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="ESSENTIAL">Essential</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="ELITE">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading resorts...</div>
          ) : filteredResorts?.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No resorts found"
              description="Try adjusting your search or filter"
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resort</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Tier</TableHead>
                    <TableHead>Since</TableHead>
                    <TableHead className="text-right">Change Tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResorts?.map((resort) => (
                    <TableRow key={resort.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{resort.name}</div>
                          <div className="text-xs text-muted-foreground">{resort.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              resort.status === 'ACTIVE'
                                ? 'default'
                                : resort.status === 'DEMO'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {resort.status}
                          </Badge>
                          {resort.is_demo && (
                            <Badge variant="outline" className="text-xs">
                              Demo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getTierBadgeClass(resort.subscription_tier as SubscriptionTier)}
                        >
                          <span className="flex items-center gap-1.5">
                            {getTierIcon(resort.subscription_tier as SubscriptionTier)}
                            {getTierInfo(resort.subscription_tier as SubscriptionTier).name}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {resort.subscription_started_at
                          ? format(new Date(resort.subscription_started_at), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as SubscriptionTier[]).map(
                            (tier) => (
                              <Button
                                key={tier}
                                variant={resort.subscription_tier === tier ? 'default' : 'ghost'}
                                size="sm"
                                className="h-8 px-2"
                                disabled={
                                  resort.subscription_tier === tier ||
                                  updateTierMutation.isPending
                                }
                                onClick={() =>
                                  updateTierMutation.mutate({ resortId: resort.id, tier })
                                }
                              >
                                {resort.subscription_tier === tier ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  getTierIcon(tier)
                                )}
                                <span className="ml-1 hidden sm:inline">
                                  {getTierInfo(tier).name.charAt(0)}
                                </span>
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
