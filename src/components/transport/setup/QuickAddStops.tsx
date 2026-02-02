import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface QuickAddStop {
  name: string;
  zone?: string;
}

const COMMON_STOPS: QuickAddStop[] = [
  { name: 'Reception', zone: 'Main' },
  { name: 'Main Pool', zone: 'Leisure' },
  { name: 'Beach', zone: 'Leisure' },
  { name: 'Restaurant', zone: 'Dining' },
  { name: 'Spa', zone: 'Wellness' },
  { name: 'Gym', zone: 'Wellness' },
  { name: 'Kids Club', zone: 'Activities' },
  { name: 'Water Sports', zone: 'Activities' },
  { name: 'Tennis Courts', zone: 'Activities' },
  { name: 'Golf Club', zone: 'Activities' },
];

interface QuickAddStopsProps {
  existingStopNames: string[];
  onAdd: (stop: QuickAddStop) => void;
  disabled?: boolean;
}

export function QuickAddStops({ existingStopNames, onAdd, disabled }: QuickAddStopsProps) {
  const existingLower = existingStopNames.map(n => n.toLowerCase());
  const availableStops = COMMON_STOPS.filter(
    s => !existingLower.includes(s.name.toLowerCase())
  );
  
  if (availableStops.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Quick add common locations:</p>
      <div className="flex flex-wrap gap-1.5">
        {availableStops.slice(0, 6).map((stop) => (
          <Button
            key={stop.name}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onAdd(stop)}
            disabled={disabled}
          >
            <Plus className="h-3 w-3" />
            {stop.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
