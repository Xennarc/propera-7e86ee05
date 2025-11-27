import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';

interface GuestSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (guest: Guest) => void;
  title?: string;
}

export function GuestSearchDialog({
  open,
  onOpenChange,
  onSelect,
  title = 'Select Guest'
}: GuestSearchDialogProps) {
  const [search, setSearch] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentResort } = useResort();

  useEffect(() => {
    if (open && currentResort) {
      fetchGuests();
    }
  }, [open, currentResort]);

  const fetchGuests = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('check_in_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setGuests(data as Guest[]);
    }
    setLoading(false);
  };

  const isCurrentGuest = (guest: Guest) => {
    const today = new Date();
    try {
      return isWithinInterval(today, {
        start: parseISO(guest.check_in_date),
        end: parseISO(guest.check_out_date),
      });
    } catch {
      return false;
    }
  };

  const filteredGuests = guests.filter(guest =>
    guest.full_name.toLowerCase().includes(search.toLowerCase()) ||
    guest.room_number.toLowerCase().includes(search.toLowerCase())
  );

  // Sort to show in-house guests first
  const sortedGuests = [...filteredGuests].sort((a, b) => {
    const aInHouse = isCurrentGuest(a);
    const bInHouse = isCurrentGuest(b);
    if (aInHouse && !bInHouse) return -1;
    if (!aInHouse && bInHouse) return 1;
    return 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : sortedGuests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search ? 'No guests found' : 'No guests available'}
                </p>
              </div>
            ) : (
              sortedGuests.map((guest) => (
                <Button
                  key={guest.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 px-4"
                  onClick={() => {
                    onSelect(guest);
                    onOpenChange(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium shrink-0">
                      {guest.room_number}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium truncate">{guest.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(guest.check_in_date), 'MMM d')} - {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
                        {isCurrentGuest(guest) && (
                          <span className="ml-2 text-success font-medium">• In-House</span>
                        )}
                      </p>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
