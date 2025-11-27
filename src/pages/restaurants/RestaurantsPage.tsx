import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Restaurant } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RestaurantDialog } from './RestaurantDialog';
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

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [deleteRestaurant, setDeleteRestaurant] = useState<Restaurant | null>(null);
  
  const { currentResort } = useResort();
  const { toast } = useToast();

  const fetchRestaurants = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setRestaurants(data as Restaurant[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRestaurants();
  }, [currentResort]);

  const handleDelete = async () => {
    if (!deleteRestaurant) return;
    
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', deleteRestaurant.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Restaurant deleted successfully' });
      fetchRestaurants();
    }
    setDeleteRestaurant(null);
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-3xl font-bold text-foreground">Restaurants</h1>
          <p className="text-muted-foreground">Manage resort dining venues</p>
        </div>
        <Button onClick={() => { setEditingRestaurant(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Restaurant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
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
          ) : filteredRestaurants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No restaurants found' : 'No restaurants yet. Add your first restaurant!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Max Pax/Booking</TableHead>
                    <TableHead>Guest Booking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRestaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{restaurant.name}</p>
                          {restaurant.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {restaurant.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{restaurant.total_capacity} seats</TableCell>
                      <TableCell>{restaurant.max_pax_per_booking}</TableCell>
                      <TableCell>
                        <Badge variant={restaurant.guest_can_book ? 'confirmed' : 'secondary'}>
                          {restaurant.guest_can_book ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={restaurant.is_active ? 'confirmed' : 'secondary'}>
                          {restaurant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingRestaurant(restaurant); setDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRestaurant(restaurant)}
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

      <RestaurantDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        restaurant={editingRestaurant}
        resortId={currentResort.id}
        onSuccess={fetchRestaurants}
      />

      <AlertDialog open={!!deleteRestaurant} onOpenChange={() => setDeleteRestaurant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteRestaurant?.name}? This will also delete all associated time slots and reservations.
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
