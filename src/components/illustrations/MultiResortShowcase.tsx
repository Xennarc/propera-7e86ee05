import { Building2, ChevronDown, Check, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const resorts = [
  { 
    id: 1, 
    name: 'Paradise Island', 
    location: 'Maldives', 
    guests: 86,
    active: true,
    color: 'bg-lagoon/10 text-lagoon border-lagoon/30'
  },
  { 
    id: 2, 
    name: 'Mountain Lodge', 
    location: 'Swiss Alps', 
    guests: 42,
    active: false,
    color: 'bg-orchid/10 text-orchid border-orchid/30'
  },
  { 
    id: 3, 
    name: 'Beach Club', 
    location: 'Bali', 
    guests: 128,
    active: false,
    color: 'bg-sunset/10 text-sunset border-sunset/30'
  },
];

export function MultiResortShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-[220px] bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg overflow-hidden", className)}>
      {/* Header - looks like a dropdown */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-teal-400/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foreground">Switch Property</p>
              <p className="text-[8px] text-muted-foreground">3 resorts connected</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Resort list */}
      <div className="p-2 space-y-1.5">
        {resorts.map((resort) => (
          <div
            key={resort.id}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer",
              resort.active
                ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                : "bg-card/80 border-border/30 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-foreground">{resort.name}</span>
                  {resort.active && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground">{resort.location}</span>
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-medium",
                resort.color
              )}>
                <Users className="h-2.5 w-2.5" />
                <span>{resort.guests}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/30 bg-muted/20">
        <p className="text-[8px] text-muted-foreground text-center">
          Data syncs across all properties
        </p>
      </div>
    </div>
  );
}
