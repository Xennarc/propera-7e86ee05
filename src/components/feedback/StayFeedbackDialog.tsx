import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Guest } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, ThumbsUp, ThumbsDown, Minus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecommendResponse = 'YES' | 'NO' | 'MAYBE';

interface StayFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest;
  onSuccess?: () => void;
}

interface StarRatingProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  optional?: boolean;
}

function StarRating({ value, onChange, label, optional = true }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}
        {optional && <span className="text-muted-foreground ml-1 text-xs">(optional)</span>}
      </Label>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star && optional ? null : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                (hovered !== null ? star <= hovered : star <= (value || 0))
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StayFeedbackDialog({ open, onOpenChange, guest, onSuccess }: StayFeedbackDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [ratingActivities, setRatingActivities] = useState<number | null>(null);
  const [ratingDiving, setRatingDiving] = useState<number | null>(null);
  const [ratingFnb, setRatingFnb] = useState<number | null>(null);
  const [ratingRoom, setRatingRoom] = useState<number | null>(null);
  const [ratingService, setRatingService] = useState<number | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<RecommendResponse | null>(null);
  const [highlightComment, setHighlightComment] = useState('');
  const [improvementComment, setImprovementComment] = useState('');

  // Check if feedback already exists
  const { data: existingFeedback } = useQuery({
    queryKey: ['existing-feedback', guest.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stay_feedback')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('check_in_date', guest.check_in_date)
        .eq('check_out_date', guest.check_out_date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!overallRating || !wouldRecommend) {
        throw new Error('Please complete required fields');
      }

      const { error } = await supabase.from('stay_feedback').insert({
        resort_id: guest.resort_id,
        guest_id: guest.id,
        room_number: guest.room_number,
        check_in_date: guest.check_in_date,
        check_out_date: guest.check_out_date,
        overall_rating: overallRating,
        rating_activities: ratingActivities,
        rating_diving: ratingDiving,
        rating_fnb: ratingFnb,
        rating_room: ratingRoom,
        rating_service: ratingService,
        would_recommend: wouldRecommend,
        highlight_comment: highlightComment.trim() || null,
        improvement_comment: improvementComment.trim() || null,
        source: 'STAFF_FILLED',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existing-feedback', guest.id] });
      toast({
        title: 'Feedback Recorded',
        description: 'End-of-stay feedback has been saved.',
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setOverallRating(null);
    setRatingActivities(null);
    setRatingDiving(null);
    setRatingFnb(null);
    setRatingRoom(null);
    setRatingService(null);
    setWouldRecommend(null);
    setHighlightComment('');
    setImprovementComment('');
  };

  const isValid = overallRating !== null && wouldRecommend !== null;

  if (existingFeedback) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback Already Recorded</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              End-of-stay feedback has already been recorded for this guest's current stay.
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record End-of-Stay Feedback</DialogTitle>
          <DialogDescription>
            Recording feedback for {guest.full_name} (Room {guest.room_number})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              label="Overall Rating"
              optional={false}
            />
          </div>

          {/* Category Ratings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <StarRating value={ratingActivities} onChange={setRatingActivities} label="Activities" />
            <StarRating value={ratingDiving} onChange={setRatingDiving} label="Diving" />
            <StarRating value={ratingFnb} onChange={setRatingFnb} label="Food & Beverage" />
            <StarRating value={ratingRoom} onChange={setRatingRoom} label="Room" />
            <StarRating value={ratingService} onChange={setRatingService} label="Service" />
          </div>

          {/* Free-text fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">Highlights <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={highlightComment}
                onChange={(e) => setHighlightComment(e.target.value)}
                placeholder="What did they enjoy most?"
                className="min-h-[60px]"
                maxLength={1000}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Improvements <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={improvementComment}
                onChange={(e) => setImprovementComment(e.target.value)}
                placeholder="Any suggestions?"
                className="min-h-[60px]"
                maxLength={1000}
              />
            </div>
          </div>

          {/* Would Recommend */}
          <div className="space-y-2">
            <Label className="text-sm">Would recommend?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={wouldRecommend === 'YES' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('YES')}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Yes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={wouldRecommend === 'MAYBE' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('MAYBE')}
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-1" />
                Maybe
              </Button>
              <Button
                type="button"
                size="sm"
                variant={wouldRecommend === 'NO' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('NO')}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                No
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!isValid || submitMutation.isPending}
              className="flex-1"
            >
              {submitMutation.isPending ? 'Saving...' : 'Save Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
