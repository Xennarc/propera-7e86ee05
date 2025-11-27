import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GuestDialog } from './GuestDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isWithinInterval, parseISO } from 'date-fns';

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  
  const { currentResort } = useResort();
  const { toast } = useToast();

  const fetchGuests = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('check_in_date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setGuests(data as Guest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGuests();
  }, [currentResort]);

  const handleDelete = async () => {
    if (!deleteGuest) return;
    
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', deleteGuest.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Guest deleted successfully' });
      fetchGuests();
    }
    setDeleteGuest(null);
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
    guest.room_number.toLowerCase().includes(search.toLowerCase()) ||
    guest.booking_reference?.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guests</h1>
          <p className="text-muted-foreground">Manage resort guests and their stays</p>
        </div>
        <Button onClick={() => { setEditingGuest(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Guest
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, room, or booking ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No guests found matching your search' : 'No guests yet. Add your first guest!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{guest.full_name}</p>
                          {guest.email && (
                            <p className="text-sm text-muted-foreground">{guest.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{guest.room_number}</span>
                      </TableCell>
                      <TableCell>{format(parseISO(guest.check_in_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(parseISO(guest.check_out_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={isCurrentGuest(guest) ? 'confirmed' : 'secondary'}>
                          {isCurrentGuest(guest) ? 'In-House' : 'Upcoming/Past'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {guest.channel && (
                          <Badge variant="outline">{guest.channel}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingGuest(guest); setDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteGuest(guest)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GuestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        guest={editingGuest}
        resortId={currentResort.id}
        onSuccess={fetchGuests}
      />

      <AlertDialog open={!!deleteGuest} onOpenChange={() => setDeleteGuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteGuest?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
