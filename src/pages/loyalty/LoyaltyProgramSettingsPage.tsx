import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { TierGate } from '@/components/tier/TierGate';
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram';
import { useResort } from '@/contexts/ResortContext';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

const EARN_CATEGORIES = [
  { id: 'activity', label: 'Activity Bookings', defaultRate: 10 },
  { id: 'dining', label: 'Restaurant Reservations', defaultRate: 5 },
  { id: 'spa', label: 'Spa Treatments', defaultRate: 15 },
];

export default function LoyaltyProgramSettingsPage() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const { 
    program, 
    programLoading, 
    earnRules, 
    upsertProgram, 
    upsertProgramPending,
    upsertEarnRule,
    isLoyaltyEnabled 
  } = useLoyaltyProgram();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_enabled: false,
    tier_mode: 'points' as 'points' | 'nights' | 'spend',
    base_earn_rate: 1,
    currency_name: 'points',
    welcome_bonus_points: 0,
  });

  const [earnRatesData, setEarnRatesData] = useState<Record<string, { rate: number; active: boolean }>>({});

  useEffect(() => {
    if (program) {
      setFormData({
        name: program.name,
        description: program.description || '',
        is_enabled: program.is_enabled,
        tier_mode: program.tier_mode,
        base_earn_rate: program.base_earn_rate,
        currency_name: program.currency_name,
        welcome_bonus_points: program.welcome_bonus_points,
      });
    } else if (currentResort) {
      setFormData(prev => ({
        ...prev,
        name: `${currentResort.name} Loyalty Club`,
      }));
    }
  }, [program, currentResort]);

  useEffect(() => {
    const ratesMap: Record<string, { rate: number; active: boolean }> = {};
    EARN_CATEGORIES.forEach(cat => {
      const rule = earnRules.find(r => r.category === cat.id);
      ratesMap[cat.id] = {
        rate: rule?.earn_rate ?? cat.defaultRate,
        active: rule?.is_active ?? true,
      };
    });
    setEarnRatesData(ratesMap);
  }, [earnRules]);

  const handleSave = () => {
    upsertProgram(formData);
  };

  const handleSaveEarnRule = (category: string) => {
    const rule = earnRatesData[category];
    if (rule) {
      upsertEarnRule({
        category,
        earn_rate: rule.rate,
        is_active: rule.active,
        earn_type: 'per_booking',
      });
    }
  };

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
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Program Settings"
        description="Configure your loyalty program"
        action={
          <Button variant="ghost" onClick={() => navigate('/staff/loyalty')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </Button>
        }
      />

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
          <CardDescription>Basic information about your loyalty program</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <Label className="text-base">Enable Program</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, guests can see and earn loyalty points
              </p>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Paradise Rewards"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency_name">Points Currency</Label>
              <Input
                id="currency_name"
                value={formData.currency_name}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_name: e.target.value }))}
                placeholder="e.g., points, stars, gems"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Program Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your loyalty program to guests..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tier_mode">Tier Progression Mode</Label>
              <Select
                value={formData.tier_mode}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, tier_mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Based on Points Earned</SelectItem>
                  <SelectItem value="nights">Based on Nights Stayed</SelectItem>
                  <SelectItem value="spend">Based on Total Spend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome_bonus">Welcome Bonus Points</Label>
              <Input
                id="welcome_bonus"
                type="number"
                min={0}
                value={formData.welcome_bonus_points}
                onChange={(e) => setFormData(prev => ({ ...prev, welcome_bonus_points: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Points awarded when a guest joins the program
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={upsertProgramPending}>
              <Save className="h-4 w-4 mr-2" />
              {upsertProgramPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Earn Rules */}
      {program && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Earning Rules
            </CardTitle>
            <CardDescription>
              Configure how guests earn points for different activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {EARN_CATEGORIES.map(category => {
                const rule = earnRatesData[category.id] || { rate: category.defaultRate, active: true };
                return (
                  <div key={category.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(checked) => {
                          setEarnRatesData(prev => ({
                            ...prev,
                            [category.id]: { ...rule, active: checked }
                          }));
                        }}
                      />
                      <div>
                        <p className="font-medium">{category.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {rule.active ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={rule.rate}
                          onChange={(e) => {
                            setEarnRatesData(prev => ({
                              ...prev,
                              [category.id]: { ...rule, rate: parseInt(e.target.value) || 0 }
                            }));
                          }}
                          className="w-24"
                          disabled={!rule.active}
                        />
                        <span className="text-sm text-muted-foreground">pts/booking</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveEarnRule(category.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
