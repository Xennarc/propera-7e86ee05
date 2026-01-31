import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useLoyaltyProgram, useLoyaltyMembers, useLoyaltyTransactions, type LoyaltyMember } from '@/hooks/useLoyaltyProgram';
import { LoyaltyTierBadge } from '@/components/loyalty/LoyaltyTierBadge';
import { FeatureGate, FeatureVisible, useFeatureEnabled } from '@/components/FeatureGate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  MapPin, 
  Plus, 
  Minus, 
  TrendingUp, 
  Gift,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

function LoyaltyMemberDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tiers, program } = useLoyaltyProgram();
  const { adjustPoints, adjustPointsPending, updateMemberTier, updateMemberTierPending } = useLoyaltyMembers();
  const { transactions, isLoading: transactionsLoading } = useLoyaltyTransactions(id);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [adjustConfirmDialogOpen, setAdjustConfirmDialogOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNote, setAdjustNote] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  
  // Sub-feature gating
  const manualAdjustmentsEnabled = useFeatureEnabled('enable_loyalty_manual_adjustments');

  // Fetch member details
  const { data: member, isLoading } = useQuery({
    queryKey: ['loyalty-member', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('loyalty_members')
        .select(`
          *,
          guest:guests(id, full_name, room_number, email, check_in_date, check_out_date),
          current_tier:loyalty_tiers(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as LoyaltyMember;
    },
    enabled: !!id,
  });

  const handleAdjustPoints = () => {
    if (!id || adjustAmount === 0) return;
    adjustPoints({ memberId: id, points: adjustAmount, note: adjustNote || undefined });
    setAdjustDialogOpen(false);
    setAdjustAmount(0);
    setAdjustNote('');
  };

  const handleChangeTier = () => {
    if (!id || !selectedTierId) return;
    updateMemberTier({ memberId: id, tierId: selectedTierId });
    setTierDialogOpen(false);
  };

  // Calculate progress to next tier
  const currentTier = member?.current_tier;
  const nextTier = tiers.find(t => 
    t.min_points > (member?.lifetime_points ?? 0) &&
    t.min_points > (currentTier?.min_points ?? 0)
  );
  const progressToNext = nextTier
    ? Math.min(100, ((member?.lifetime_points ?? 0) / nextTier.min_points) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <PageHeader title="Member Not Found" />
        <Button onClick={() => navigate('/staff/loyalty')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loyalty
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title={member.guest?.full_name || 'Loyalty Member'}
        description={`Room ${member.guest?.room_number}`}
        action={
          <Button variant="ghost" onClick={() => navigate('/staff/loyalty')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Member Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Loyalty Status</span>
              {currentTier && (
                <LoyaltyTierBadge
                  tierName={currentTier.name}
                  badgeColor={currentTier.badge_color}
                  badgeIcon={currentTier.badge_icon}
                  isElite={currentTier.is_elite}
                  size="lg"
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Points Display */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Available Points</p>
                <p className="text-3xl font-bold">{member.points_balance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{program?.currency_name || 'points'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lifetime Points</p>
                <p className="text-3xl font-bold text-muted-foreground">{member.lifetime_points.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{program?.currency_name || 'points'}</p>
              </div>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Progress to {nextTier.name}
                  </span>
                  <span className="font-medium">
                    {(nextTier.min_points - member.lifetime_points).toLocaleString()} more to go
                  </span>
                </div>
                <Progress value={progressToNext} className="h-3" />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {manualAdjustmentsEnabled ? (
                <>
                  <Button onClick={() => setAdjustDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adjust Points
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedTierId(currentTier?.id || '');
                    setTierDialogOpen(true);
                  }}>
                    Change Tier
                  </Button>
                </>
              ) : (
                <Button variant="outline" disabled className="opacity-60">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Manual Adjustments Disabled
                </Button>
              )}
              {member.guest && (
                <Button variant="ghost" onClick={() => navigate(`/staff/guests/${member.guest!.id}`)}>
                  <User className="h-4 w-4 mr-2" />
                  View Guest Profile
                </Button>
              )}
            </div>

            {/* Current Tier Perks */}
            {currentTier && Array.isArray(currentTier.perks_json) && currentTier.perks_json.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Gift className="h-4 w-4" />
                  {currentTier.name} Perks
                </h4>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {currentTier.perks_json.map((perk: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guest Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{member.guest?.full_name}</p>
                <p className="text-sm text-muted-foreground">{member.guest?.email || 'No email'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Room {member.guest?.room_number}</p>
              </div>
            </div>
            {member.guest?.check_in_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm">
                    {format(parseISO(member.guest.check_in_date), 'MMM d')} - {format(parseISO(member.guest.check_out_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Member since {format(parseISO(member.joined_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.points_change >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {tx.points_change >= 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{tx.source.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(tx.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {tx.note && <p className="text-xs text-muted-foreground mt-0.5">{tx.note}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.points_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points_change >= 0 ? '+' : ''}{tx.points_change.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {tx.points_balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Points Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Points Adjustment</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustAmount < 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdjustAmount(prev => Math.abs(prev) * -1 || -100)}
                >
                  <Minus className="h-4 w-4 mr-1" /> Deduct
                </Button>
                <Button
                  type="button"
                  variant={adjustAmount >= 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAdjustAmount(prev => Math.abs(prev) || 100)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <Input
                type="number"
                value={Math.abs(adjustAmount)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setAdjustAmount(adjustAmount < 0 ? -val : val);
                }}
                placeholder="Enter amount"
              />
              <p className="text-sm text-muted-foreground">
                {adjustAmount >= 0 ? 'Adding' : 'Deducting'} {Math.abs(adjustAmount).toLocaleString()} points
              </p>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustPoints} disabled={adjustPointsPending || adjustAmount === 0}>
              {adjustPointsPending ? 'Saving...' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select New Tier</Label>
              <Select value={selectedTierId} onValueChange={setSelectedTierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map(tier => (
                    <SelectItem key={tier.id} value={tier.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tier.badge_color }}
                        />
                        {tier.name} ({tier.min_points.toLocaleString()} pts)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              This will manually override the member's tier. They will stay at this tier until their points qualify them for a higher one.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeTier} disabled={updateMemberTierPending || !selectedTierId}>
              {updateMemberTierPending ? 'Saving...' : 'Update Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoyaltyMemberDetailPage() {
  return (
    <FeatureGate requiredFlags={['enable_loyalty']} mode="staff">
      <LoyaltyMemberDetailPageContent />
    </FeatureGate>
  );
}
