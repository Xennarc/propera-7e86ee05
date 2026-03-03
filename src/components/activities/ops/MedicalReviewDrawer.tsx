/**
 * MedicalReviewDrawer – Staff drawer to review guest medical declarations.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertTriangle, Loader2, HeartPulse } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MedicalReviewStatus } from '@/types/ops';

const CONDITION_LABELS: Record<string, string> = {
  asthma: 'Asthma',
  heart: 'Heart condition',
  diabetes: 'Diabetes',
  recent_surgery: 'Recent surgery',
  pregnancy: 'Pregnancy',
  back_neck: 'Back / Neck',
  epilepsy: 'Epilepsy',
  other: 'Other',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestName: string;
  currentStatus: MedicalReviewStatus;
  medicalAnswersJson: Record<string, unknown> | null;
  existingNotes: string | null;
  sessionId: string;
}

export function MedicalReviewDrawer({
  open,
  onOpenChange,
  bookingId,
  guestName,
  currentStatus,
  medicalAnswersJson,
  existingNotes,
  sessionId,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(existingNotes ?? '');
  const [loading, setLoading] = useState(false);

  const conditions = medicalAnswersJson
    ? Object.keys(medicalAnswersJson).filter(k => medicalAnswersJson[k])
    : [];

  const handleAction = async (status: MedicalReviewStatus) => {
    setLoading(true);
    try {
      const updates: Record<string, unknown> = {
        medical_review_status: status,
        medical_reviewed_by: user?.id ?? null,
        medical_reviewed_at: new Date().toISOString(),
        medical_notes: notes.trim() || null,
      };
      // If cleared, mark medical_status as complete
      if (status === 'cleared') {
        updates.medical_status = 'complete';
      }

      const { error } = await supabase
        .from('activity_booking_readiness')
        .update(updates as any)
        .eq('booking_id', bookingId);
      if (error) throw error;

      toast.success(status === 'cleared' ? 'Medical cleared ✅' : 'Follow-up required flagged');
      qc.invalidateQueries({ queryKey: ['activity-booking-readiness-session', sessionId] });
      qc.invalidateQueries({ queryKey: ['activity-booking-readiness', bookingId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = () => {
    switch (currentStatus) {
      case 'cleared':
        return <Badge className="bg-success/15 text-success border-success/30">Cleared</Badge>;
      case 'requires_followup':
        return <Badge variant="destructive">Follow-up Required</Badge>;
      case 'pending':
        return <Badge className="bg-warning/15 text-warning border-warning/30">Pending Review</Badge>;
      default:
        return null;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            Medical Review
          </DrawerTitle>
          <DrawerDescription>{guestName}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-safe-bottom space-y-4 overflow-y-auto">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {statusBadge()}
          </div>

          {/* Conditions */}
          {conditions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Declared conditions:</p>
              <div className="flex flex-wrap gap-2">
                {conditions.map(key => (
                  <Badge
                    key={key}
                    variant="outline"
                    className="bg-warning/10 text-warning border-warning/30 text-sm py-1 px-3"
                  >
                    {CONDITION_LABELS[key] ?? key}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
              No conditions declared
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Guest confirmed asthma is well-controlled, cleared to proceed"
              className="text-base min-h-[80px]"
              onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-white"
              onClick={() => handleAction('cleared')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Clear
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12 text-base"
              onClick={() => handleAction('requires_followup')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              Follow-up
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
