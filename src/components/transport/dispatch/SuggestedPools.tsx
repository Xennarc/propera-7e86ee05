import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  MapPin, 
  Users, 
  ArrowRight,
  Plus,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

interface SuggestedPoolsProps {
  requests: TransportQueueRequest[];
  onCreatePool: (requestIds: string[]) => void;
  isCreating: boolean;
}

interface PoolSuggestion {
  id: string;
  label: string;
  zone: string | null;
  direction: string;
  requestIds: string[];
  totalPartySize: number;
  timeSpan: number; // minutes
  requests: TransportQueueRequest[];
}

// Group requests by pickup zone, similar direction, and time window
function generatePoolSuggestions(requests: TransportQueueRequest[]): PoolSuggestion[] {
  const suggestions: PoolSuggestion[] = [];
  const used = new Set<string>();
  
  // Only consider queued requests (not already assigned)
  const poolable = requests.filter(r => 
    r.status === 'requested' || r.status === 'queued'
  ).sort((a, b) => {
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
  
  // Group by pickup zone or stop
  const byPickup = new Map<string, TransportQueueRequest[]>();
  
  for (const req of poolable) {
    const key = req.pickup_stop?.name || req.pickup_text || 'unknown';
    if (!byPickup.has(key)) byPickup.set(key, []);
    byPickup.get(key)!.push(req);
  }
  
  // Create suggestions from groups with 2+ requests
  for (const [pickup, group] of byPickup) {
    if (group.length < 2) continue;
    
    // Further group by direction (dropoff zone)
    const byDropoff = new Map<string, TransportQueueRequest[]>();
    for (const req of group) {
      const dropKey = req.dropoff_stop?.name || req.dropoff_text || 'unknown';
      if (!byDropoff.has(dropKey)) byDropoff.set(dropKey, []);
      byDropoff.get(dropKey)!.push(req);
    }
    
    for (const [dropoff, dirGroup] of byDropoff) {
      if (dirGroup.length < 2) continue;
      
      // Check time window (within 15 minutes of each other)
      const sorted = dirGroup;
      
      const timeSpan = differenceInMinutes(
        new Date(sorted[sorted.length - 1].created_at),
        new Date(sorted[0].created_at)
      );
      
      // Only suggest if within 30 min window
      if (timeSpan > 30) continue;
      
      // Check if any requests already used
      const available = sorted.filter(r => !used.has(r.id));
      if (available.length < 2) continue;
      
      const totalPartySize = available.reduce((sum, r) => sum + r.party_size, 0);
      
      suggestions.push({
        id: `${pickup}-${dropoff}`,
        label: `${pickup} → ${dropoff}`,
        zone: (available[0].pickup_stop as any)?.zone || null,
        direction: dropoff,
        requestIds: available.map(r => r.id),
        totalPartySize,
        timeSpan,
        requests: available,
      });
      
      // Mark as used
      available.forEach(r => used.add(r.id));
    }
  }
  
  // Sort by party size (larger groups first)
  return suggestions.sort((a, b) => b.totalPartySize - a.totalPartySize);
}

export function SuggestedPools({ requests, onCreatePool, isCreating }: SuggestedPoolsProps) {
  const suggestions = useMemo(() => generatePoolSuggestions(requests), [requests]);
  
  if (suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="p-3 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Suggested Pools</span>
        <Badge variant="secondary" className="h-5 text-xs">
          {suggestions.length}
        </Badge>
      </div>
      
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1 scroll-fade-x">
          {suggestions.map((pool) => (
            <PoolCard 
              key={pool.id} 
              pool={pool} 
              onCreate={() => onCreatePool(pool.requestIds)}
              isCreating={isCreating}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface PoolCardProps {
  pool: PoolSuggestion;
  onCreate: () => void;
  isCreating: boolean;
}

function PoolCard({ pool, onCreate, isCreating }: PoolCardProps) {
  return (
    <div className="flex-shrink-0 w-56 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {pool.requestIds.length} requests
        </Badge>
        {pool.zone && (
          <Badge variant="secondary" className="text-xs">
            {pool.zone}
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-1 text-sm mb-2 truncate">
        <MapPin className="h-3 w-3 text-green-500 shrink-0" />
        <span className="truncate">{pool.requests[0]?.pickup_stop?.name || 'Pickup'}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
        <MapPin className="h-3 w-3 text-red-500 shrink-0" />
        <span className="truncate">{pool.direction}</span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {pool.totalPartySize} passengers
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pool.timeSpan}m span
        </span>
      </div>
      
      <Button 
        size="sm" 
        className="w-full h-8"
        onClick={onCreate}
        disabled={isCreating}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Create Trip
      </Button>
    </div>
  );
}
