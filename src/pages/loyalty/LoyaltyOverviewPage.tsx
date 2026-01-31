import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { TierGate, TierBadge } from '@/components/tier/TierGate';
import { FeatureGate } from '@/components/FeatureGate';
import { useLoyaltyProgram, useLoyaltyMembers } from '@/hooks/useLoyaltyProgram';
import { LoyaltyTierBadge } from '@/components/loyalty/LoyaltyTierBadge';
import { 
  Settings, 
  Users, 
  Crown, 
  TrendingUp, 
  Search,
  ChevronRight,
  Gift,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

function LoyaltyOverviewPageContent() {
  const navigate = useNavigate();
  const { program, programLoading, tiers, isLoyaltyEnabled } = useLoyaltyProgram();
  const { members, isLoading: membersLoading } = useLoyaltyMembers();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(m => 
    m.guest?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.guest?.room_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalMembers = members.length;
  const membersByTier = tiers.map(tier => ({
    ...tier,
    count: members.filter(m => m.current_tier_id === tier.id).length
  }));
  const totalPointsIssued = members.reduce((sum, m) => sum + m.lifetime_points, 0);

  if (!isLoyaltyEnabled) {
    return (
      <div className="p-6">
        <TierGate feature="loyalty_program" fallback="upgrade-prompt">
          <div />
        </TierGate>
      </div>
    );
  }

  if (programLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6">
        <PageHeader 
          title="Loyalty Program"
          description="Configure your resort's loyalty program"
        />
        <EmptyState
          icon={Crown}
          title="No Loyalty Program Yet"
          description="Set up your resort's loyalty program to start rewarding guests for their bookings."
          action={
            <Button onClick={() => navigate('/staff/loyalty/program')}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Program
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Loyalty Program"
        description={program.name}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/staff/loyalty/tiers')}>
              <Star className="h-4 w-4 mr-2" />
              Manage Tiers
            </Button>
            <Button onClick={() => navigate('/staff/loyalty/program')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        }
      />

      {/* Program Status */}
      {!program.is_enabled && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 flex items-center justify-between">
            <p className="text-sm text-amber-600">
              Your loyalty program is currently disabled. Guests cannot see or earn points.
            </p>
            <Button size="sm" onClick={() => navigate('/staff/loyalty/program')}>
              Enable Program
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tiers.length}</p>
                <p className="text-xs text-muted-foreground">Loyalty Tiers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPointsIssued.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Points Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Gift className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{program.welcome_bonus_points}</p>
                <p className="text-xs text-muted-foreground">Welcome Bonus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      {membersByTier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {membersByTier.map(tier => (
                <div key={tier.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                  <LoyaltyTierBadge
                    tierName={tier.name}
                    badgeColor={tier.badge_color}
                    badgeIcon={tier.badge_icon}
                    isElite={tier.is_elite}
                    size="sm"
                  />
                  <span className="font-medium">{tier.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Loyalty Members</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No members found matching your search.' : 'No loyalty members yet.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredMembers.slice(0, 20).map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 -mx-4 px-4 transition-colors"
                  onClick={() => navigate(`/staff/loyalty/members/${member.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{member.guest?.full_name || 'Unknown Guest'}</p>
                      <p className="text-sm text-muted-foreground">
                        Room {member.guest?.room_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {member.current_tier && (
                      <LoyaltyTierBadge
                        tierName={member.current_tier.name}
                        badgeColor={member.current_tier.badge_color}
                        badgeIcon={member.current_tier.badge_icon}
                        isElite={member.current_tier.is_elite}
                        size="sm"
                      />
                    )}
                    <div className="text-right">
                      <p className="font-medium">{member.points_balance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">pts balance</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoyaltyOverviewPage() {
  return (
    <FeatureGate requiredFlags={['enable_loyalty']} mode="staff">
      <LoyaltyOverviewPageContent />
    </FeatureGate>
  );
}
