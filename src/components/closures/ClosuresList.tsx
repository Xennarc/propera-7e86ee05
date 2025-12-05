import { useState } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, CalendarX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ActivityClosure, RestaurantClosure } from '@/types/database';
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

interface ClosuresListProps {
  closures: (ActivityClosure | RestaurantClosure)[];
  type: 'activity' | 'restaurant';
  onRefresh: () => void;
  showEntityName?: boolean;
}

export function ClosuresList({ closures, type, onRefresh, showEntityName = false }: ClosuresListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const tableName = type === 'activity' ? 'activity_closures' : 'restaurant_closures';

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Closure removed' });
      onRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const today = startOfDay(new Date());

  // Sort closures by date, future first
  const sortedClosures = [...closures].sort((a, b) => 
    new Date(a.closure_date).getTime() - new Date(b.closure_date).getTime()
  );

  const futureClosures = sortedClosures.filter(c => !isBefore(parseISO(c.closure_date), today));
  const pastClosures = sortedClosures.filter(c => isBefore(parseISO(c.closure_date), today));

  if (closures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CalendarX className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No closure dates configured</p>
      </div>
    );
  }

  const getEntityName = (closure: ActivityClosure | RestaurantClosure) => {
    if ('activity' in closure && closure.activity) {
      return closure.activity.name;
    }
    if ('restaurant' in closure && closure.restaurant) {
      return closure.restaurant.name;
    }
    return '';
  };

  const renderClosure = (closure: ActivityClosure | RestaurantClosure, isPast: boolean) => (
    <div
      key={closure.id}
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isPast ? 'bg-muted/30 opacity-60' : 'bg-background'
      }`}
    >
      <div className="flex items-center gap-3">
        <CalendarX className={`h-4 w-4 ${isPast ? 'text-muted-foreground' : 'text-destructive'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {format(parseISO(closure.closure_date), 'EEE, MMM d, yyyy')}
            </span>
            {isPast && <Badge variant="outline" className="text-xs">Past</Badge>}
          </div>
          {showEntityName && (
            <span className="text-sm text-muted-foreground">{getEntityName(closure)}</span>
          )}
          {closure.reason && (
            <p className="text-sm text-muted-foreground">{closure.reason}</p>
          )}
        </div>
      </div>
      {!isPast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteId(closure.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {futureClosures.map(c => renderClosure(c, false))}
        {pastClosures.length > 0 && futureClosures.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2">Past closures</div>
        )}
        {pastClosures.slice(0, 3).map(c => renderClosure(c, true))}
        {pastClosures.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{pastClosures.length - 3} more past closures
          </p>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Closure</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow bookings on this date again. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
