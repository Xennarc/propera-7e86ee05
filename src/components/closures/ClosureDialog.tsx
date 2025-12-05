import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';

interface ClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'activity' | 'restaurant';
  entityId: string;
  entityName: string;
  resortId: string;
  onSuccess: () => void;
}

export function ClosureDialog({
  open,
  onOpenChange,
  type,
  entityId,
  entityName,
  resortId,
  onSuccess,
}: ClosureDialogProps) {
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let error;
      if (type === 'activity') {
        const result = await supabase
          .from('activity_closures')
          .insert({
            resort_id: resortId,
            activity_id: entityId,
            closure_date: date,
            reason: reason || null,
          });
        error = result.error;
      } else {
        const result = await supabase
          .from('restaurant_closures')
          .insert({
            resort_id: resortId,
            restaurant_id: entityId,
            closure_date: date,
            reason: reason || null,
          });
        error = result.error;
      }

      if (error) {
        if (error.code === '23505') {
          toast({ variant: 'destructive', title: 'Error', description: 'This date is already marked as closed.' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Closure added', description: `${entityName} will be closed on ${format(new Date(date), 'MMM d, yyyy')}` });
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Closure Date</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Mark <span className="font-medium text-foreground">{entityName}</span> as closed on a specific date.
            No sessions/slots will be available for booking on this date.
          </p>
          <div className="space-y-2">
            <Label htmlFor="closure-date">Date</Label>
            <Input
              id="closure-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Maintenance, Private event, Holiday..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !date}>
            {loading ? 'Adding...' : 'Add Closure'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
