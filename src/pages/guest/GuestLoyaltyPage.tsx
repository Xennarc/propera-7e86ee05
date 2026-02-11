import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { LoyaltyCard } from '@/components/loyalty/LoyaltyCard';
import { LoyaltyTierBadge } from '@/components/loyalty/LoyaltyTierBadge';
import { useGuestLoyalty } from '@/hooks/useGuestLoyalty';
import { 
  Crown, 
  TrendingUp, 
  Gift, 
  Star, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function GuestLoyaltyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    loyaltyInfo,
    isLoading,
    isEnrolled,
    currentTier,
    nextTier,
    pointsBalance,
    lifetimePoints,
    program,
    allTiers,
    recentTransactions,
  } = useGuestLoyalty();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Crown className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loyalty Program</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start earning rewards on your bookings! You'll automatically join our loyalty program when you make your first booking.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(GUEST_ROUTES.ACTIVITIES)}>
              Browse Activities
            </Button>
            <Button variant="outline" onClick={() => navigate(GUEST_ROUTES.RESTAURANTS)}>
              Book a Table
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
        {/* Loyalty Card */}
        <LoyaltyCard
          tierName={currentTier?.name || 'Member'}
          tierColor={currentTier?.badge_color}
          tierIcon={currentTier?.badge_icon}
          isElite={currentTier?.is_elite}
          pointsBalance={pointsBalance}
          lifetimePoints={lifetimePoints}
          nextTierName={nextTier?.name}
          pointsToNextTier={nextTier?.points_needed}
          currencyName={program?.currency_name}
          perks={currentTier?.perks || []}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex-col items-center gap-2"
            onClick={() => navigate(GUEST_ROUTES.ACTIVITIES)}
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm">Earn Points</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex-col items-center gap-2"
            onClick={() => navigate(GUEST_ROUTES.BOOKINGS)}
          >
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-sm">My Bookings</span>
          </Button>
        </div>

        {/* Tier Journey */}
        {allTiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Journey
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                
                <div className="space-y-6">
                  {allTiers.map((tier, index) => {
                    const isCurrentOrPast = lifetimePoints >= tier.min_points;
                    const isCurrent = tier.is_current;
                    
                    return (
                      <div key={tier.id} className="flex items-start gap-4 relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                            isCurrent
                              ? 'ring-4 ring-primary/20'
                              : isCurrentOrPast
                              ? ''
                              : 'bg-muted'
                          }`}
                          style={{ backgroundColor: isCurrentOrPast ? tier.badge_color : undefined }}
                        >
                          {isCurrentOrPast ? (
                            <Star className="h-4 w-4 text-white" />
                          ) : (
                            <Star className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium ${isCurrent ? 'text-primary' : isCurrentOrPast ? '' : 'text-muted-foreground'}`}>
                                {tier.name}
                                {isCurrent && (
                                  <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Current
                                  </span>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {tier.min_points.toLocaleString()} {program?.currency_name || 'points'}
                              </p>
                            </div>
                            {isCurrentOrPast && (
                              <span className="text-green-600 text-sm">✓</span>
                            )}
                          </div>
                          {tier.perks && tier.perks.length > 0 && isCurrent && (
                            <ul className="mt-2 space-y-1">
                              {tier.perks.slice(0, 2).map((perk: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Gift className="h-3 w-3" /> {perk}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {recentTransactions.map(tx => (
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
                        <p className="font-medium text-sm capitalize">
                          {tx.source.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(tx.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-medium ${tx.points_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points_change >= 0 ? '+' : ''}{tx.points_change.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Program Info */}
      {/* Program Info */}
      {program?.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About {program.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{program.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
