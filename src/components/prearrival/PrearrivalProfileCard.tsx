import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardList, 
  Copy, 
  Check, 
  Plane, 
  Clock, 
  Car, 
  UtensilsCrossed, 
  AlertTriangle,
  PartyPopper,
  FileCheck,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PrearrivalStatusBadge } from './PrearrivalStatusBadge';
import { PrearrivalLinkManager } from './PrearrivalLinkManager';
import { StaffPrearrivalData } from '@/hooks/useStaffPrearrivalData';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface PrearrivalProfileCardProps {
  guestId: string;
  guestName: string;
  resortId: string;
  resortName: string;
  checkInDate: string;
  checkOutDate: string;
  data: StaffPrearrivalData;
  isLoading: boolean;
}

export function PrearrivalProfileCard({
  guestId,
  guestName,
  resortId,
  resortName,
  checkInDate,
  checkOutDate,
  data,
  isLoading,
}: PrearrivalProfileCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showFullRequests, setShowFullRequests] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { profile, settings, review, status } = data;

  // Mark as reviewed mutation
  const markReviewedMutation = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase
        .from('prearrival_staff_reviews')
        .upsert({
          guest_id: guestId,
          resort_id: resortId,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          internal_notes: notes || null,
        }, { onConflict: 'guest_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-prearrival-data', guestId] });
      toast({ title: 'Marked as reviewed' });
      setShowReviewForm(false);
      setReviewNotes('');
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Copy summary for sharing
  const copySummary = async () => {
    const lines = [`📋 Pre-Arrival Summary for ${guestName}`];
    lines.push(`Status: ${status === 'completed' ? 'Completed ✅' : status === 'in_progress' ? 'In Progress 🔄' : 'Not Started'}`);
    
    if (profile?.arrival_time) {
      const timeStr = profile.arrival_time.slice(0, 5);
      const flightStr = profile.arrival_flight_number ? ` (Flight ${profile.arrival_flight_number})` : '';
      lines.push(`Arriving: ${format(parseISO(checkInDate), 'MMM d')}, ${timeStr}${flightStr}`);
    }
    
    if (profile?.transfer_preference) {
      lines.push(`Transfer: ${formatTransferPreference(profile.transfer_preference)}`);
    }
    
    if (profile?.allergies) {
      lines.push(`Allergies: ${profile.allergies} ⚠️`);
    }
    
    if (profile?.dietary_preferences && profile.dietary_preferences.length > 0) {
      lines.push(`Dietary: ${profile.dietary_preferences.join(', ')}`);
    }
    
    if (profile?.special_occasions && profile.special_occasions.length > 0) {
      lines.push(`Special: ${profile.special_occasions.join(', ')} 🎉`);
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast({ title: 'Summary copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pre-Arrival Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  // Empty state when no profile exists
  if (!profile || !data.hasAnyData) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-5 w-5" />
            Pre-Arrival Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <LinkIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No pre-arrival details yet</p>
            <p className="text-sm text-muted-foreground/80 mb-4">
              Send the guest a pre-arrival link to collect arrival details and preferences.
            </p>
            <div className="flex justify-center">
              <PrearrivalLinkManager
                guestId={guestId}
                guestName={guestName}
                checkInDate={checkInDate}
                checkOutDate={checkOutDate}
                resortId={resortId}
                resortName={resortName}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLongRequest = profile.special_requests && profile.special_requests.length > 150;
  const truncatedRequest = isLongRequest && !showFullRequests 
    ? profile.special_requests!.slice(0, 150) + '...' 
    : profile.special_requests;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Pre-Arrival Profile
        </CardTitle>
        <div className="flex items-center gap-2">
          <PrearrivalStatusBadge status={status} />
          <Button variant="ghost" size="sm" onClick={copySummary}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Arrival Details */}
        {settings?.show_arrival_details !== false && (
          <Section title="Arrival Details" icon={Plane}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <InfoItem 
                label="Arrival Time" 
                value={profile.arrival_time ? profile.arrival_time.slice(0, 5) : null} 
                fallback="Not provided"
              />
              <InfoItem 
                label="Flight" 
                value={profile.arrival_flight_number} 
                fallback="Not provided"
              />
              <InfoItem 
                label="Transfer" 
                value={profile.transfer_preference ? formatTransferPreference(profile.transfer_preference) : null} 
                fallback="Not specified"
                icon={profile.transfer_preference ? <Car className="h-3.5 w-3.5" /> : undefined}
              />
              {profile.baggage_count !== null && (
                <InfoItem 
                  label="Luggage" 
                  value={`${profile.baggage_count} piece${profile.baggage_count !== 1 ? 's' : ''}`} 
                />
              )}
            </div>
          </Section>
        )}

        {/* Dietary & Allergies */}
        {settings?.show_preferences !== false && (
          <Section title="Dietary & Allergies" icon={UtensilsCrossed}>
            {(profile.dietary_preferences && profile.dietary_preferences.length > 0) || profile.allergies ? (
              <div className="space-y-2">
                {profile.allergies && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <span className="text-sm font-medium text-destructive">{profile.allergies}</span>
                  </div>
                )}
                {profile.dietary_preferences && profile.dietary_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.dietary_preferences.map((pref: string) => (
                      <Badge key={pref} variant="secondary" className="text-xs">
                        {pref}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No dietary requirements noted</p>
            )}
          </Section>
        )}

        {/* Special Occasions & Requests */}
        {settings?.show_special_occasions !== false && (
          <Section title="Special Occasions & Requests" icon={PartyPopper}>
            {(profile.special_occasions && profile.special_occasions.length > 0) || profile.special_requests ? (
              <div className="space-y-2">
                {profile.special_occasions && profile.special_occasions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.special_occasions.map((occ: string) => (
                      <Badge key={occ} className="bg-primary/10 text-primary border-primary/20">
                        {getOccasionEmoji(occ)} {occ}
                      </Badge>
                    ))}
                  </div>
                )}
                {profile.special_requests && (
                  <div>
                    <p className="text-sm">{truncatedRequest}</p>
                    {isLongRequest && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-xs"
                        onClick={() => setShowFullRequests(!showFullRequests)}
                      >
                        {showFullRequests ? (
                          <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
                        ) : (
                          <>View more <ChevronDown className="h-3 w-3 ml-1" /></>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No special occasions or requests</p>
            )}
          </Section>
        )}

        {/* Policy Acknowledgements */}
        {settings?.require_policy_acknowledgement ? (
          <Section title="Policy Acknowledgements" icon={FileCheck}>
            <div className="flex items-center gap-4 text-sm">
              <AckItem 
                label="Terms acknowledged" 
                acknowledged={!!profile.policy_acknowledged_at} 
              />
              {settings.require_esignature && (
                <AckItem 
                  label="E-signature" 
                  acknowledged={!!profile.esignature_name} 
                />
              )}
            </div>
          </Section>
        ) : (
          settings !== null && (
            <div className="text-xs text-muted-foreground">
              Policy acknowledgements not required for this resort.
            </div>
          )
        )}

        {/* Staff Review Section */}
        <div className="pt-3 border-t">
          {review ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4 text-success" />
              <span>
                Reviewed by {review.reviewer_name} on {format(parseISO(review.reviewed_at), 'MMM d, h:mm a')}
              </span>
              {review.internal_notes && (
                <span className="text-xs">• {review.internal_notes}</span>
              )}
            </div>
          ) : (
            <div>
              {showReviewForm ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Optional notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="h-16 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => markReviewedMutation.mutate(reviewNotes)}
                      disabled={markReviewedMutation.isPending}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Confirm Review
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowReviewForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowReviewForm(true)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pre-arrival Link Manager */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pre-arrival Link</span>
            <PrearrivalLinkManager
              guestId={guestId}
              guestName={guestName}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              resortId={resortId}
              resortName={resortName}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper Components
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoItem({ 
  label, 
  value, 
  fallback = 'Not provided',
  icon 
}: { 
  label: string; 
  value: string | null | undefined; 
  fallback?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn(
        "font-medium flex items-center gap-1",
        !value && "text-muted-foreground/60"
      )}>
        {icon}
        {value || fallback}
      </dd>
    </div>
  );
}

function AckItem({ label, acknowledged }: { label: string; acknowledged: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {acknowledged ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <span className="h-4 w-4 text-muted-foreground">✗</span>
      )}
      {label}
    </span>
  );
}

// Helpers
function formatTransferPreference(pref: string): string {
  const map: Record<string, string> = {
    speedboat: '🚤 Speedboat',
    seaplane: '✈️ Seaplane',
    domestic: '🛩️ Domestic flight',
    private: '🛥️ Private transfer',
    none: 'No transfer needed',
  };
  return map[pref.toLowerCase()] || pref;
}

function getOccasionEmoji(occasion: string): string {
  const lower = occasion.toLowerCase();
  if (lower.includes('honeymoon')) return '🥂';
  if (lower.includes('anniversary')) return '💍';
  if (lower.includes('birthday')) return '🎂';
  if (lower.includes('wedding')) return '💒';
  return '🎉';
}
