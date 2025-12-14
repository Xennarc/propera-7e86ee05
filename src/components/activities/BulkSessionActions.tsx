import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, X, Trash2, XCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BulkSessionActionsProps {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkSessionActions({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  onSuccess,
}: BulkSessionActionsProps) {
  const [action, setAction] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const hasSelection = selectedIds.length > 0;
  const allSelected = selectedIds.length === totalCount && totalCount > 0;

  const handleAction = async () => {
    if (!action || selectedIds.length === 0) return;

    setLoading(true);
    try {
      if (action === 'delete') {
        // Check for bookings first
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('id')
          .in('session_id', selectedIds)
          .in('status', ['CONFIRMED', 'PENDING'])
          .limit(1);

        if (bookings && bookings.length > 0) {
          toast({
            variant: 'destructive',
            title: 'Cannot delete',
            description: 'Some sessions have active bookings. Cancel the bookings first or cancel the sessions instead.',
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase
          .from('activity_sessions')
          .delete()
          .in('id', selectedIds);

        if (error) throw error;
        toast({ title: 'Deleted', description: `${selectedIds.length} sessions deleted.` });
      } else if (action === 'cancel') {
        const { error } = await supabase
          .from('activity_sessions')
          .update({ status: 'CANCELLED' })
          .in('id', selectedIds);

        if (error) throw error;
        toast({ title: 'Cancelled', description: `${selectedIds.length} sessions cancelled.` });
      } else if (action === 'complete') {
        const { error } = await supabase
          .from('activity_sessions')
          .update({ status: 'COMPLETED' })
          .in('id', selectedIds);

        if (error) throw error;
        toast({ title: 'Completed', description: `${selectedIds.length} sessions marked as completed.` });
      } else if (action === 'reschedule') {
        const { error } = await supabase
          .from('activity_sessions')
          .update({ status: 'SCHEDULED' })
          .in('id', selectedIds);

        if (error) throw error;
        toast({ title: 'Rescheduled', description: `${selectedIds.length} sessions rescheduled.` });
      }

      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setAction('');
    }
  };

  const getActionLabel = () => {
    switch (action) {
      case 'delete': return 'Delete Sessions';
      case 'cancel': return 'Cancel Sessions';
      case 'complete': return 'Complete Sessions';
      case 'reschedule': return 'Reschedule Sessions';
      default: return 'Apply Action';
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case 'delete': return `This will permanently delete ${selectedIds.length} session(s). This action cannot be undone.`;
      case 'cancel': return `This will cancel ${selectedIds.length} session(s). Guests will need to be notified.`;
      case 'complete': return `This will mark ${selectedIds.length} session(s) as completed.`;
      case 'reschedule': return `This will set ${selectedIds.length} session(s) back to scheduled status.`;
      default: return '';
    }
  };

  return (
    <>
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-all",
        hasSelection ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
      )}>
        {/* Selection toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="gap-2"
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : hasSelection ? (
            <div className="relative">
              <Square className="h-4 w-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-0.5 bg-current" />
              </div>
            </div>
          ) : (
            <Square className="h-4 w-4" />
          )}
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>

        {/* Selection count */}
        {hasSelection && (
          <>
            <Badge variant="secondary" className="font-medium">
              {selectedIds.length} selected
            </Badge>

            {/* Action selector */}
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-44 bg-background">
                <SelectValue placeholder="Bulk action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cancel">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-warning" />
                    Cancel Selected
                  </span>
                </SelectItem>
                <SelectItem value="complete">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Mark Completed
                  </span>
                </SelectItem>
                <SelectItem value="reschedule">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Set Scheduled
                  </span>
                </SelectItem>
                <SelectItem value="delete">
                  <span className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Apply button */}
            {action && (
              <Button
                size="sm"
                variant={action === 'delete' ? 'destructive' : 'default'}
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Apply
              </Button>
            )}

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              className="ml-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionLabel()}</AlertDialogTitle>
            <AlertDialogDescription>{getActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={loading}
              className={action === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {loading ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}