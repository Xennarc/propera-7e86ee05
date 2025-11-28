import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, CheckCircle2, ThumbsUp, ThumbsDown, Minus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecommendResponse = 'YES' | 'NO' | 'MAYBE';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  optional?: boolean;
}

function StarRating({ value, onChange, label, optional = true }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted-foreground ml-1">(optional)</span>}
      </Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star && optional ? null : star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'h-8 w-8 transition-colors',
                (hovered !== null ? star <= hovered : star <= (value || 0))
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
        {optional && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default function GuestStayFeedback() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
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

  // Check if guest can submit feedback
  const { data: canSubmitData, isLoading: checkingEligibility } = useQuery({
    queryKey: ['can-submit-feedback', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_can_submit_feedback', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as { can_submit: boolean; reason?: string };
    },
    enabled: !!guest,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!guest || !overallRating || !wouldRecommend) {
        throw new Error('Please complete required fields');
      }

      const { data, error } = await supabase.rpc('guest_submit_stay_feedback', {
        p_guest_id: guest.guestId,
        p_overall_rating: overallRating,
        p_would_recommend: wouldRecommend,
        p_rating_activities: ratingActivities,
        p_rating_diving: ratingDiving,
        p_rating_fnb: ratingFnb,
        p_rating_room: ratingRoom,
        p_rating_service: ratingService,
        p_highlight_comment: highlightComment.trim() || null,
        p_improvement_comment: improvementComment.trim() || null,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['can-submit-feedback'] });
      toast({
        title: 'Thank you for your feedback!',
        description: 'We really appreciate it. Have a safe journey home.',
      });
      navigate('/guest');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  if (!guest) return null;

  if (checkingEligibility) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Already submitted
  if (!canSubmitData?.can_submit && canSubmitData?.reason === 'Already submitted') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/guest')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-primary/20">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You for Your Feedback</h2>
            <p className="text-muted-foreground">
              We really appreciate you taking the time to share your thoughts with us. Have a safe journey home!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not eligible (outside window)
  if (!canSubmitData?.can_submit) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/guest')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Feedback is available near the end of your stay. Please check back closer to your check-out date.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = overallRating !== null && wouldRecommend !== null;

  return (
    <div className="space-y-6 pb-8">
      <Button variant="ghost" onClick={() => navigate('/guest')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Home
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>How was your stay?</CardTitle>
          <CardDescription>
            Your feedback helps us improve. This takes less than a minute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Overall Rating - Required */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              label="Overall, how was your stay?"
              optional={false}
            />
          </div>

          {/* Category Ratings - Optional */}
          <div className="space-y-6">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Rate specific areas (optional)
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <StarRating
                value={ratingActivities}
                onChange={setRatingActivities}
                label="Activities & Excursions"
              />
              <StarRating
                value={ratingDiving}
                onChange={setRatingDiving}
                label="Diving & Snorkelling"
              />
              <StarRating
                value={ratingFnb}
                onChange={setRatingFnb}
                label="Food & Beverage"
              />
              <StarRating
                value={ratingRoom}
                onChange={setRatingRoom}
                label="Room & Cleanliness"
              />
              <StarRating
                value={ratingService}
                onChange={setRatingService}
                label="Staff & Service"
              />
            </div>
          </div>

          {/* Free-text fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What did you enjoy most? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={highlightComment}
                onChange={(e) => setHighlightComment(e.target.value)}
                placeholder="Share your highlights..."
                className="min-h-[80px]"
                maxLength={1000}
              />
            </div>
            <div className="space-y-2">
              <Label>Is there anything we could have done better? <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={improvementComment}
                onChange={(e) => setImprovementComment(e.target.value)}
                placeholder="Your suggestions help us improve..."
                className="min-h-[80px]"
                maxLength={1000}
              />
            </div>
          </div>

          {/* Would Recommend - Required */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
            <Label className="font-medium">Would you recommend us to a friend?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={wouldRecommend === 'YES' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('YES')}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === 'MAYBE' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('MAYBE')}
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-2" />
                Maybe
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === 'NO' ? 'default' : 'outline'}
                onClick={() => setWouldRecommend('NO')}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                No
              </Button>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!isValid || submitMutation.isPending}
            className="w-full"
            size="lg"
          >
            {submitMutation.isPending ? 'Sending feedback...' : 'Send Feedback'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
