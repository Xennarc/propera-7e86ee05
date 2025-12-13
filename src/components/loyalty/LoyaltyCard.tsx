import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LoyaltyTierBadge } from './LoyaltyTierBadge';
import { Sparkles, TrendingUp, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoyaltyCardProps {
  tierName: string;
  tierColor?: string;
  tierIcon?: string | null;
  isElite?: boolean;
  pointsBalance: number;
  lifetimePoints: number;
  nextTierName?: string;
  pointsToNextTier?: number;
  currencyName?: string;
  perks?: string[];
  compact?: boolean;
  className?: string;
}

export function LoyaltyCard({
  tierName,
  tierColor = '#6B7280',
  tierIcon,
  isElite = false,
  pointsBalance,
  lifetimePoints,
  nextTierName,
  pointsToNextTier,
  currencyName = 'points',
  perks = [],
  compact = false,
  className,
}: LoyaltyCardProps) {
  const progress = nextTierName && pointsToNextTier
    ? Math.min(100, Math.max(0, ((lifetimePoints) / (lifetimePoints + pointsToNextTier)) * 100))
    : 100;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <LoyaltyTierBadge
          tierName={tierName}
          badgeColor={tierColor}
          badgeIcon={tierIcon}
          isElite={isElite}
          size="sm"
        />
        <span className="text-sm text-muted-foreground">
          {pointsBalance.toLocaleString()} {currencyName}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div
        className="h-2"
        style={{ backgroundColor: tierColor }}
      />
      <CardContent className="pt-4 space-y-4">
        {/* Tier Badge */}
        <div className="flex items-center justify-between">
          <LoyaltyTierBadge
            tierName={tierName}
            badgeColor={tierColor}
            badgeIcon={tierIcon}
            isElite={isElite}
            size="lg"
          />
          {isElite && (
            <Sparkles className="h-5 w-5 text-amber-500" />
          )}
        </div>

        {/* Points Display */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-2xl font-bold text-foreground">
              {pointsBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{currencyName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Lifetime</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {lifetimePoints.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{currencyName}</p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTierName && pointsToNextTier && pointsToNextTier > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Progress to {nextTierName}
              </span>
              <span className="font-medium">{pointsToNextTier.toLocaleString()} {currencyName} to go</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Top Perks Preview */}
        {perks.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Gift className="h-3 w-3" /> Your Perks
            </p>
            <ul className="space-y-1">
              {perks.slice(0, 3).map((perk, index) => (
                <li key={index} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {perk}
                </li>
              ))}
              {perks.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  +{perks.length - 3} more benefits
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
