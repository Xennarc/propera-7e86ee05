import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight, UserPlus } from 'lucide-react';
import { useTravelParty } from '@/hooks/useTravelParty';
import { Skeleton } from '@/components/ui/skeleton';

export function TravelPartyCard() {
  const { travelParty, isLoading, adultsCount, childrenCount, roomsCount } = useTravelParty();

  if (isLoading) {
    return (
      <Card className="guest-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasParty = travelParty && travelParty.members && travelParty.members.length > 1;

  return (
    <Card className="guest-card hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <Link to="/guest/travel-party" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Travel Party
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {hasParty 
                ? `${Number(adultsCount) || 0} adult${adultsCount !== 1 ? 's' : ''}${childrenCount > 0 ? `, ${Number(childrenCount) || 0} child${childrenCount !== 1 ? 'ren' : ''}` : ''}`
                : 'Manage your travel party'
              }
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </Link>
      </CardContent>
    </Card>
  );
}
