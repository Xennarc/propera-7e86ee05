import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useDriverStats } from '@/hooks/driver/useDriverStats';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Car, 
  Users, 
  Clock, 
  TrendingUp,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ElementType;
  className?: string;
}

function StatCard({ label, value, subValue, icon: Icon, className }: StatCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-4 rounded-xl border bg-card',
      className
    )}>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
      {subValue && (
        <span className="text-[10px] text-muted-foreground/70 mt-0.5">{subValue}</span>
      )}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card">
      <Skeleton className="h-8 w-8 rounded-full mb-2" />
      <Skeleton className="h-7 w-10 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function DriverStatsSection() {
  const { user } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;

  const { data: stats, isLoading, error } = useDriverStats(resortId, user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return null; // Fail silently - stats are nice-to-have
  }

  // If no trips at all, show friendly empty state
  if (stats.tripsLast7Days === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No completed trips yet. Your stats will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Car}
            value={stats.tripsToday}
            label="Trips Today"
            subValue={`${stats.tripsLast7Days} this week`}
          />
          <StatCard
            icon={Users}
            value={stats.passengersToday}
            label="Passengers Today"
            subValue={`${stats.passengersLast7Days} this week`}
          />
          <StatCard
            icon={TrendingUp}
            value={stats.tripsLast7Days}
            label="Trips (7 days)"
          />
          {stats.avgDurationMinutes !== null ? (
            <StatCard
              icon={Clock}
              value={`${stats.avgDurationMinutes}m`}
              label="Avg Trip Duration"
            />
          ) : (
            <StatCard
              icon={Clock}
              value={stats.passengersLast7Days}
              label="Passengers (7 days)"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
