import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Users, 
  ArrowDown, 
  AlertTriangle,
  Wand2,
  Star,
  Accessibility,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

interface TripPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: TransportQueueRequest[];
  onConfirm: () => void;
  isCreating: boolean;
  defaultCapacity?: number;
}

interface PreviewStop {
  id: string;
  type: 'pickup' | 'dropoff';
  name: string;
  zone: string | null;
  requestId: string;
  guestName: string | null;
  partySize: number;
  isVip: boolean;
  needsAccessible: boolean;
}

// Generate optimized stop order
function generateStopOrder(requests: TransportQueueRequest[]): PreviewStop[] {
  const stops: PreviewStop[] = [];
  
  // Add all pickups first (grouped by location)
  const pickupsByLocation = new Map<string, TransportQueueRequest[]>();
  for (const req of requests) {
    const key = req.pickup_stop?.id || req.pickup_text || 'unknown';
    if (!pickupsByLocation.has(key)) pickupsByLocation.set(key, []);
    pickupsByLocation.get(key)!.push(req);
  }
  
  for (const [_, reqs] of pickupsByLocation) {
    for (const req of reqs) {
      stops.push({
        id: `pickup-${req.id}`,
        type: 'pickup',
        name: req.pickup_stop?.name || req.pickup_text || 'Unknown',
        zone: (req.pickup_stop as any)?.zone || null,
        requestId: req.id,
        guestName: req.guest_name,
        partySize: req.party_size,
        isVip: req.priority === 'vip',
        needsAccessible: req.needs_accessible,
      });
    }
  }
  
  // Then add dropoffs (grouped by location)
  const dropoffsByLocation = new Map<string, TransportQueueRequest[]>();
  for (const req of requests) {
    const key = req.dropoff_stop?.id || req.dropoff_text || 'unknown';
    if (!dropoffsByLocation.has(key)) dropoffsByLocation.set(key, []);
    dropoffsByLocation.get(key)!.push(req);
  }
  
  for (const [_, reqs] of dropoffsByLocation) {
    for (const req of reqs) {
      stops.push({
        id: `dropoff-${req.id}`,
        type: 'dropoff',
        name: req.dropoff_stop?.name || req.dropoff_text || 'Unknown',
        zone: (req.dropoff_stop as any)?.zone || null,
        requestId: req.id,
        guestName: req.guest_name,
        partySize: req.party_size,
        isVip: req.priority === 'vip',
        needsAccessible: req.needs_accessible,
      });
    }
  }
  
  return stops;
}

export function TripPreviewSheet({
  open,
  onOpenChange,
  requests,
  onConfirm,
  isCreating,
  defaultCapacity = 6,
}: TripPreviewSheetProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const stops = useMemo(() => generateStopOrder(requests), [requests]);
  
  const totalPartySize = requests.reduce((sum, r) => sum + r.party_size, 0);
  const capacityPercent = Math.min((totalPartySize / defaultCapacity) * 100, 100);
  const isOverCapacity = totalPartySize > defaultCapacity;
  const hasVip = requests.some(r => r.priority === 'vip');
  const needsAccessible = requests.some(r => r.needs_accessible);
  
  // Warnings
  const warnings: string[] = [];
  if (isOverCapacity) {
    warnings.push(`Party size (${totalPartySize}) exceeds default capacity (${defaultCapacity})`);
  }
  if (needsAccessible && !requests.every(r => r.needs_accessible)) {
    warnings.push('Mixed accessible and non-accessible requests');
  }
  
  const handleOptimize = () => {
    setIsOptimizing(true);
    // Simulated optimization - in real app would call optimization algorithm
    setTimeout(() => setIsOptimizing(false), 500);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Trip Preview</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold">{requests.length}</p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold">{totalPartySize}</p>
              <p className="text-xs text-muted-foreground">Passengers</p>
            </div>
            <div className="p-3 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold">{stops.length}</p>
              <p className="text-xs text-muted-foreground">Stops</p>
            </div>
          </div>
          
          {/* Capacity meter */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Capacity</span>
              <span className={cn('font-medium', isOverCapacity && 'text-destructive')}>
                {totalPartySize} / {defaultCapacity}
              </span>
            </div>
            <Progress 
              value={capacityPercent} 
              className={cn('h-2', isOverCapacity && '[&>div]:bg-destructive')}
            />
          </div>
          
          {/* Badges */}
          <div className="flex gap-2 mb-4">
            {hasVip && (
              <Badge className="gap-1 bg-amber-500/20 text-amber-600 border-amber-500/30">
                <Star className="h-3 w-3 fill-current" />
                VIP
              </Badge>
            )}
            {needsAccessible && (
              <Badge className="gap-1 bg-blue-500/20 text-blue-600 border-blue-500/30">
                <Accessibility className="h-3 w-3" />
                Accessible Required
              </Badge>
            )}
          </div>
          
          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-4 space-y-2">
              {warnings.map((warning, i) => (
                <Alert key={i} variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          {/* Optimize button */}
          <div className="flex justify-end mb-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOptimize}
              disabled={isOptimizing}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              {isOptimizing ? 'Optimizing...' : 'Auto-optimize order'}
            </Button>
          </div>
          
          {/* Stop order preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Proposed Stop Order
            </h4>
            
            {stops.map((stop, index) => (
              <div key={stop.id}>
                <div className={cn(
                  'p-3 rounded-lg border bg-card',
                  stop.isVip && 'border-amber-500/30',
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white',
                      stop.type === 'pickup' ? 'bg-green-500' : 'bg-red-500'
                    )}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <MapPin className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          stop.type === 'pickup' ? 'text-green-500' : 'text-red-500'
                        )} />
                        <span className="font-medium text-sm truncate">{stop.name}</span>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {stop.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{stop.guestName || 'Guest'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {stop.partySize}
                        </span>
                        {stop.isVip && (
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        )}
                        {stop.needsAccessible && (
                          <Accessibility className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < stops.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <SheetFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isCreating}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create Trip'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
