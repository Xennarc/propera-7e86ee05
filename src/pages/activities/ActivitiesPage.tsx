import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity } from '@/types/database';
import { ActivityCategoryKey } from '@/lib/activity-category-config';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useDemoReadOnly } from '@/hooks/useDemoReadOnly';
import { DemoReadOnlyBanner } from '@/components/demo/DemoReadOnlyBanner';
import { SetupBanner } from '@/components/staff/SetupBanner';
import { ActivityDialog } from './ActivityDialog';
import {
  ActivityCard,
  ActivityCardGrid,
  ActivitiesHeader,
  ActivitiesEmptyState,
  ActivitiesTableView,
} from '@/components/activities';
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

type ViewMode = 'cards' | 'table';

export default function ActivitiesPage() {
  const { isReadOnly } = useDemoReadOnly();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, { total: number; upcoming: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategoryKey | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);

  const { currentResort } = useResort();
  const { toast } = useToast();

  // Fetch activities and session counts
  const fetchActivities = async () => {
    if (!currentResort) return;

    setLoading(true);
    
    // Fetch activities
    const { data: activitiesData, error } = await supabase
      .from('activities')
      .select('*')
      .eq('resort_id', currentResort.id)
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setLoading(false);
      return;
    }

    setActivities(activitiesData as Activity[]);

    // Fetch session counts per activity
    if (activitiesData && activitiesData.length > 0) {
      const activityIds = activitiesData.map(a => a.id);
      const today = new Date().toISOString().split('T')[0];

      // Total sessions
      const { data: allSessions } = await supabase
        .from('activity_sessions')
        .select('activity_id')
        .in('activity_id', activityIds);

      // Upcoming sessions (scheduled, date >= today)
      const { data: upcomingSessions } = await supabase
        .from('activity_sessions')
        .select('activity_id')
        .in('activity_id', activityIds)
        .eq('status', 'SCHEDULED')
        .gte('date', today);

      const counts: Record<string, { total: number; upcoming: number }> = {};
      activityIds.forEach(id => {
        counts[id] = { total: 0, upcoming: 0 };
      });

      allSessions?.forEach(s => {
        if (counts[s.activity_id]) counts[s.activity_id].total++;
      });
      upcomingSessions?.forEach(s => {
        if (counts[s.activity_id]) counts[s.activity_id].upcoming++;
      });

      setSessionCounts(counts);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [currentResort]);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [activities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = 
        activity.name.toLowerCase().includes(search.toLowerCase()) ||
        activity.category.toLowerCase().includes(search.toLowerCase()) ||
        (activity.description?.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategory = 
        selectedCategory === 'all' || activity.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activities, search, selectedCategory]);

  // Check if any sessions exist
  const hasAnySessions = Object.values(sessionCounts).some(c => c.total > 0);

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

  const handleOpenEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingActivity(null);
    setDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
  };

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
      {isReadOnly && <DemoReadOnlyBanner />}

      {/* Setup Banner: Activities exist but no sessions */}
      {activities.length > 0 && !hasAnySessions && !isReadOnly && (
        <SetupBanner
          id="activities-need-sessions"
          title="Next step: Add sessions for your activities"
          description="Sessions define when each activity is available. Without sessions, guests won't see your activities in the portal."
          actionLabel="Go to Sessions"
          actionUrl="/staff/activities/sessions"
          resortId={currentResort.id}
        />
      )}

      {/* Header with Search & Filters */}
      <ActivitiesHeader
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categoryCounts={categoryCounts}
        onAddActivity={handleOpenAdd}
        isReadOnly={isReadOnly}
      />

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredActivities.length === 0 ? (
        /* Empty State */
        <ActivitiesEmptyState
          hasSearch={search.length > 0}
          hasCategory={selectedCategory !== 'all'}
          onAddActivity={handleOpenAdd}
          onClearFilters={handleClearFilters}
          isReadOnly={isReadOnly}
        />
      ) : viewMode === 'cards' ? (
        /* Card Grid View */
        <ActivityCardGrid>
          {filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              sessionCount={sessionCounts[activity.id]?.total || 0}
              upcomingSessionCount={sessionCounts[activity.id]?.upcoming || 0}
              onEdit={() => handleOpenEdit(activity)}
              onDelete={() => setDeleteActivity(activity)}
              isReadOnly={isReadOnly}
            />
          ))}
        </ActivityCardGrid>
      ) : (
        /* Table View */
        <ActivitiesTableView
          activities={filteredActivities}
          sessionCounts={sessionCounts}
          onEdit={handleOpenEdit}
          onDelete={setDeleteActivity}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        resortId={currentResort.id}
        onSuccess={fetchActivities}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteActivity} onOpenChange={() => setDeleteActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteActivity?.name}"? This will also delete all associated sessions and bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
