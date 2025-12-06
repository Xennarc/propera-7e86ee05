import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { Calendar, Clock, Users, Plus, ExternalLink, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  meal_period: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'EVENT';
  status: 'OPEN' | 'CLOSED' | 'FULL';
  confirmed_covers?: number;
}

interface RestaurantSlotsListProps {
  restaurantId: string;
  restaurantName: string;
  resortId: string;
  onClose?: () => void;
}

const mealPeriodLabels: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  EVENT: 'Event',
};

const mealPeriodColors: Record<string, string> = {
  BREAKFAST: 'bg-amber-500/10 text-amber-600',
  LUNCH: 'bg-sky-500/10 text-sky-600',
  DINNER: 'bg-indigo-500/10 text-indigo-600',
  EVENT: 'bg-purple-500/10 text-purple-600',
};

export function RestaurantSlotsList({ restaurantId, restaurantName, resortId, onClose }: RestaurantSlotsListProps) {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, [restaurantId]);

  const fetchSlots = async () => {
    setLoading(true);
    
    // Fetch slots
    const { data: slotsData, error } = await supabase
      .from('restaurant_time_slots')
      .select('id, date, start_time, end_time, capacity, meal_period, status')
      .eq('restaurant_id', restaurantId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error || !slotsData) {
      setLoading(false);
      return;
    }

    // Fetch confirmed reservation counts for each slot
    const slotIds = slotsData.map(s => s.id);
    const { data: reservationsData } = await supabase
      .from('restaurant_reservations')
      .select('restaurant_slot_id, num_adults, num_children')
      .in('restaurant_slot_id', slotIds)
      .eq('status', 'CONFIRMED');

    // Calculate confirmed covers per slot
    const coversBySlot: Record<string, number> = {};
    if (reservationsData) {
      reservationsData.forEach(r => {
        coversBySlot[r.restaurant_slot_id] = (coversBySlot[r.restaurant_slot_id] || 0) + r.num_adults + r.num_children;
      });
    }

    const slotsWithCovers = slotsData.map(s => ({
      ...s,
      confirmed_covers: coversBySlot[s.id] || 0,
    }));

    setSlots(slotsWithCovers);
    setLoading(false);
  };

  const today = startOfToday();
  const upcomingSlots = slots.filter(s => 
    s.status === 'OPEN' && !isBefore(parseISO(s.date), today)
  );
  const pastSlots = slots.filter(s => 
    s.status !== 'OPEN' || isBefore(parseISO(s.date), today)
  );

  const handleNavigateToSlot = (slotId: string) => {
    onClose?.();
    navigate(`/staff/restaurants/slots/${slotId}`);
  };

  const handleCreateSlot = () => {
    onClose?.();
    navigate(`/staff/restaurants/slots/new?restaurantId=${restaurantId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          Time Slots ({slots.length})
        </h4>
        <Button size="sm" variant="outline" onClick={handleCreateSlot}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Slot
        </Button>
      </div>

      {slots.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
          <p>No time slots created yet</p>
          <Button size="sm" variant="link" onClick={handleCreateSlot} className="mt-1">
            Create your first time slot
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Upcoming Slots */}
          {upcomingSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Upcoming ({upcomingSlots.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {upcomingSlots.map(slot => (
                  <SlotRow 
                    key={slot.id} 
                    slot={slot} 
                    onNavigate={handleNavigateToSlot}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past/Other Slots */}
          {pastSlots.length > 0 && (
            <Collapsible open={showPast} onOpenChange={setShowPast}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="text-xs uppercase tracking-wide">
                    Past & Other ({pastSlots.length})
                  </span>
                  {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-2 max-h-48 overflow-y-auto">
                {pastSlots.map(slot => (
                  <SlotRow 
                    key={slot.id} 
                    slot={slot} 
                    onNavigate={handleNavigateToSlot}
                    isPast
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

function SlotRow({ 
  slot, 
  onNavigate, 
  isPast = false 
}: { 
  slot: Slot; 
  onNavigate: (id: string) => void;
  isPast?: boolean;
}) {
  const occupancy = slot.capacity > 0 
    ? Math.round(((slot.confirmed_covers || 0) / slot.capacity) * 100)
    : 0;
  const isFull = (slot.confirmed_covers || 0) >= slot.capacity;

  return (
    <button
      onClick={() => onNavigate(slot.id)}
      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors hover:bg-muted/50 group ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <div className={`text-xs font-medium ${isPast ? 'text-muted-foreground' : ''}`}>
            {format(parseISO(slot.date), 'MMM d')}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {format(parseISO(slot.date), 'EEE')}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] px-1.5 py-0 ${mealPeriodColors[slot.meal_period]}`}>
              {mealPeriodLabels[slot.meal_period]}
            </Badge>
            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className={`text-xs ${isFull ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {slot.confirmed_covers || 0}/{slot.capacity} covers
              {isFull && ' (Full)'}
            </span>
            {occupancy > 0 && !isFull && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {occupancy}%
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {slot.status === 'OPEN' ? (
          <Badge variant="outline" className="text-[10px] text-success border-success/30">Open</Badge>
        ) : slot.status === 'CLOSED' ? (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">Closed</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Full</Badge>
        )}
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
