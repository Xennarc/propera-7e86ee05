import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TripEditLockProps {
  tripId: string;
  onLockStatusChange?: (isLocked: boolean, lockedBy: string | null) => void;
}

interface LockState {
  isLocked: boolean;
  lockedBy: string | null;
  lockedByName: string | null;
  isOwnLock: boolean;
}

const LOCK_TIMEOUT_MS = 60000; // 1 minute soft lock

export function TripEditLock({ tripId, onLockStatusChange }: TripEditLockProps) {
  const { user } = useAuth();
  const [lockState, setLockState] = useState<LockState>({
    isLocked: false,
    lockedBy: null,
    lockedByName: null,
    isOwnLock: false,
  });
  
  useEffect(() => {
    if (!tripId || !user?.id) return;
    
    // Create presence channel for this trip
    const channel = supabase.channel(`trip-edit-${tripId}`);
    
    // Track our presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as unknown as Array<{
          user_id: string;
          user_name: string;
          editing_since: string;
        }>;
        
        // Find the oldest active editor (lock holder)
        const sorted = presences
          .filter(p => p.editing_since && Date.now() - new Date(p.editing_since).getTime() < LOCK_TIMEOUT_MS)
          .sort((a, b) => new Date(a.editing_since).getTime() - new Date(b.editing_since).getTime());
        
        if (sorted.length === 0) {
          setLockState({
            isLocked: false,
            lockedBy: null,
            lockedByName: null,
            isOwnLock: false,
          });
          onLockStatusChange?.(false, null);
        } else {
          const lockHolder = sorted[0];
          const isOwnLock = lockHolder.user_id === user.id;
          setLockState({
            isLocked: !isOwnLock,
            lockedBy: lockHolder.user_id,
            lockedByName: lockHolder.user_name,
            isOwnLock,
          });
          onLockStatusChange?.(!isOwnLock, isOwnLock ? null : lockHolder.user_id);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await channel.track({
            user_id: user.id,
            user_name: user.email?.split('@')[0] || 'Staff',
            editing_since: new Date().toISOString(),
          });
        }
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, [tripId, user?.id, onLockStatusChange]);
  
  if (!lockState.isLocked) {
    return null;
  }
  
  return (
    <Badge 
      variant="outline" 
      className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30"
    >
      <Lock className="h-3 w-3" />
      Editing: {lockState.lockedByName || 'Staff'}
    </Badge>
  );
}

// Hook for managing lock state
export function useTripEditLock(tripId: string | null) {
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  
  const handleLockChange = (locked: boolean, by: string | null) => {
    setIsLocked(locked);
    setLockedBy(by);
  };
  
  return {
    isLocked,
    lockedBy,
    LockIndicator: tripId ? (
      <TripEditLock tripId={tripId} onLockStatusChange={handleLockChange} />
    ) : null,
  };
}
