import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TierGate } from '@/components/tier/TierGate';
import { FeatureGate } from '@/components/FeatureGate';
import { useLoyaltyProgram, type LoyaltyTier } from '@/hooks/useLoyaltyProgram';
import { LoyaltyTierBadge } from '@/components/loyalty/LoyaltyTierBadge';
import { ArrowLeft, Plus, Pencil, Trash2, Crown, Star, GripVertical } from 'lucide-react';

const TIER_COLORS = [
  { value: '#6B7280', label: 'Gray' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#14B8A6', label: 'Teal' },
];

const DEFAULT_TIERS = [
  { name: 'Classic', min_points: 0, is_default: true, badge_color: '#6B7280' },
  { name: 'Silver', min_points: 500, badge_color: '#9CA3AF' },
  { name: 'Gold', min_points: 1500, badge_color: '#F59E0B' },
  { name: 'Platinum', min_points: 5000, is_elite: true, badge_color: '#8B5CF6' },
];

function LoyaltyTiersPageContent() {
  const navigate = useNavigate();
  const { 
    program, 
    programLoading, 
    tiers, 
    tiersLoading,
    createTier,
    createTierPending,
    updateTier,
    updateTierPending,
    deleteTier,
    deleteTierPending,
    isLoyaltyEnabled 
  } = useLoyaltyProgram();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_points: 0,
    badge_color: '#6B7280',
    is_default: false,
    is_elite: false,
    perks_json: [] as string[],
  });
  const [newPerk, setNewPerk] = useState('');

  const handleOpenDialog = (tier?: LoyaltyTier) => {
    if (tier) {
      setEditingTier(tier);
      setFormData({
        name: tier.name,
        description: tier.description || '',
        min_points: tier.min_points,
        badge_color: tier.badge_color,
        is_default: tier.is_default,
        is_elite: tier.is_elite,
        perks_json: Array.isArray(tier.perks_json) ? tier.perks_json : [],
      });
    } else {
      setEditingTier(null);
      setFormData({
        name: '',
        description: '',
        min_points: 0,
        badge_color: '#6B7280',
        is_default: false,
        is_elite: false,
        perks_json: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingTier) {
      updateTier({ id: editingTier.id, ...formData });
    } else {
      createTier(formData);
    }
    setDialogOpen(false);
  };

  const handleAddPerk = () => {
    if (newPerk.trim()) {
      setFormData(prev => ({
        ...prev,
        perks_json: [...prev.perks_json, newPerk.trim()]
      }));
      setNewPerk('');
    }
  };

  const handleRemovePerk = (index: number) => {
    setFormData(prev => ({
      ...prev,
      perks_json: prev.perks_json.filter((_, i) => i !== index)
    }));
  };

  const handleCreateDefaultTiers = () => {
    DEFAULT_TIERS.forEach((tier, index) => {
      setTimeout(() => {
        createTier({ ...tier, priority: index });
      }, index * 100);
    });
  };

  if (!isLoyaltyEnabled) {
    return (
      <div className="p-6">
        <TierGate feature="loyalty_tiers" fallback="upgrade-prompt">
          <div />
        </TierGate>
      </div>
    );
  }

  if (programLoading || tiersLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6">
        <PageHeader 
          title="Loyalty Tiers"
          description="Configure your loyalty program first"
        />
        <EmptyState
          icon={Crown}
          title="Program Not Configured"
          description="Please set up your loyalty program before configuring tiers."
          action={
            <Button onClick={() => navigate('/staff/loyalty/program')}>
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
        title="Loyalty Tiers"
        description="Define membership levels and their benefits"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/staff/loyalty')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>
        }
      />

      {tiers.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No Tiers Defined"
          description="Create loyalty tiers to reward your guests based on their engagement."
          action={
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Tier
              </Button>
              <Button variant="outline" onClick={handleCreateDefaultTiers}>
                Use Default Tiers (Classic, Silver, Gold, Platinum)
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <Card key={tier.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    <LoyaltyTierBadge
                      tierName={tier.name}
                      badgeColor={tier.badge_color}
                      badgeIcon={tier.badge_icon}
                      isElite={tier.is_elite}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.min_points.toLocaleString()} pts minimum</span>
                        {tier.is_default && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Default</span>
                        )}
                        {tier.is_elite && (
                          <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">Elite</span>
                        )}
                      </div>
                      {tier.description && (
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {Array.isArray(tier.perks_json) && tier.perks_json.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {tier.perks_json.length} perk{tier.perks_json.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tier)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Tier?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the "{tier.name}" tier. Members currently at this tier will remain until their next tier calculation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTier(tier.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit Tier' : 'Create Tier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tier-name">Tier Name</Label>
                <Input
                  id="tier-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Gold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-points">Minimum Points</Label>
                <Input
                  id="min-points"
                  type="number"
                  min={0}
                  value={formData.min_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_points: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier-desc">Description</Label>
              <Input
                id="tier-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Short description of this tier"
              />
            </div>

            <div className="space-y-2">
              <Label>Badge Color</Label>
              <div className="flex flex-wrap gap-2">
                {TIER_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full ring-offset-2 transition-all ${
                      formData.badge_color === color.value ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData(prev => ({ ...prev, badge_color: color.value }))}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <span className="text-sm">Default tier for new members</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={formData.is_elite}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_elite: checked }))}
                />
                <span className="text-sm">Elite tier (top tier)</span>
              </label>
            </div>

            <div className="space-y-2">
              <Label>Perks & Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={newPerk}
                  onChange={(e) => setNewPerk(e.target.value)}
                  placeholder="Add a perk..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPerk())}
                />
                <Button type="button" variant="outline" onClick={handleAddPerk}>Add</Button>
              </div>
              {formData.perks_json.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {formData.perks_json.map((perk, index) => (
                    <li key={index} className="flex items-center justify-between text-sm bg-muted px-3 py-2 rounded">
                      <span>{perk}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePerk(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createTierPending || updateTierPending || !formData.name}>
              {editingTier ? 'Update' : 'Create'} Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoyaltyTiersPage() {
  return (
    <FeatureGate requiredFlags={['enable_loyalty']} mode="staff">
      <LoyaltyTiersPageContent />
    </FeatureGate>
  );
}
