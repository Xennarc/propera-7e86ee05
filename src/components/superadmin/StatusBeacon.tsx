import { cn } from '@/lib/utils';

export type BeaconStatus = 'active' | 'idle' | 'error';

interface StatusBeaconProps {
  status: BeaconStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const statusColors = {
  active: 'bg-success',
  idle: 'bg-warning',
  error: 'bg-destructive',
};

export function StatusBeacon({ 
  status, 
  size = 'md', 
  showPulse = true,
  className 
}: StatusBeaconProps) {
  const shouldPulse = showPulse && (status === 'idle' || status === 'error');
  
  return (
    <div className={cn('relative flex', sizeClasses[size], className)}>
      {/* Pulse ring for non-active states */}
      {shouldPulse && (
        <span 
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            statusColors[status],
            status === 'error' ? 'animate-ping' : 'animate-pulse'
          )} 
        />
      )}
      {/* Solid dot */}
      <span 
        className={cn(
          'relative inline-flex rounded-full',
          sizeClasses[size],
          statusColors[status]
        )} 
      />
    </div>
  );
}

// Helper to determine beacon status based on activity timestamp
export function getBeaconStatus(lastActivityTime?: Date | string | null): BeaconStatus {
  if (!lastActivityTime) return 'idle';
  
  const now = new Date();
  const lastActivity = new Date(lastActivityTime);
  const diffMs = now.getTime() - lastActivity.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  if (diffMinutes < 5) return 'active';      // Active in last 5 minutes
  if (diffMinutes < 60) return 'idle';       // No activity in 1 hour
  return 'error';                             // No activity for > 1 hour
}
