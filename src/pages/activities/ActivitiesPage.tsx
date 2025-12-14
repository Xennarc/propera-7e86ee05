import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity, ActivityCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Calendar, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ActivityDialog } from './ActivityDialog';
import { SetupBanner } from '@/components/staff/SetupBanner';
import { CategoryBadge, CategoryIcon } from '@/components/ui/category-badge';
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

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessionsCount, setSessionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);
  
  const { currentResort } = useResort();
  const { toast } = useToast();

  const fetchActivities = async () => {
    if (!currentResort) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setActivities(data as Activity[]);
    }
    
    // Check if any sessions exist
    const { count } = await supabase
      .from('activity_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', currentResort.id);
    setSessionsCount(count ?? 0);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [currentResort]);

  const handleDelete = async () => {
    if (!deleteActivity) return;
    
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', deleteActivity.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Activity deleted successfully' });
      fetchActivities();
    }
    setDeleteActivity(null);
  };

  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(search.toLowerCase()) ||
    activity.category.toLowerCase().includes(search.toLowerCase())
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
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Activities</h1>
          <p className="page-header-subtitle">Manage resort activities and excursions</p>
        </div>
        <Button onClick={() => { setEditingActivity(null); setDialogOpen(true); }} className="tap-target">
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {/* Setup Banner: Activities exist but no sessions */}
      {activities.length > 0 && sessionsCount === 0 && (
        <SetupBanner
          id="activities-need-sessions"
          title="Next step: Add sessions for your activities"
          description="Sessions define when each activity is available. Without sessions, guests won't see your activities in the portal."
          actionLabel="Go to Sessions"
          actionUrl="/staff/activities/sessions"
          resortId={currentResort.id}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="empty-state">
              <div className="rounded-full bg-muted/60 p-4 mb-4">
                <Sparkles className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="empty-state-title">
                {search ? 'No activities found' : 'No activities yet'}
              </h3>
              <p className="empty-state-description">
                {search 
                  ? 'Try adjusting your search terms'
                  : "Create your first activity to get started with bookings."}
              </p>
              {!search && (
                <Button onClick={() => { setEditingActivity(null); setDialogOpen(true); }} className="tap-target">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Activity
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                            <CategoryIcon category={activity.category} iconKey={(activity as any).icon_key} size={20} />
                          </div>
                          <div>
                            <p className="font-medium">{activity.name}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CategoryBadge category={activity.category} iconKey={(activity as any).icon_key} size="md" />
                      </TableCell>
                      <TableCell>{activity.duration_minutes} min</TableCell>
                      <TableCell>${activity.default_price_per_person}</TableCell>
                      <TableCell>{activity.default_max_capacity} pax</TableCell>
                      <TableCell>
                        <Badge variant={activity.is_active ? 'confirmed' : 'secondary'}>
                          {activity.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingActivity(activity); setDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteActivity(activity)}
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

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        resortId={currentResort.id}
        onSuccess={fetchActivities}
      />

      <AlertDialog open={!!deleteActivity} onOpenChange={() => setDeleteActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteActivity?.name}? This will also delete all associated sessions and bookings.
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
