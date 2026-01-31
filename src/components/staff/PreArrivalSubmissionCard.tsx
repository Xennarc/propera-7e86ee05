import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { 
  FileText, 
  Clock, 
  Plane, 
  Utensils, 
  AlertTriangle, 
  PartyPopper,
  Droplets,
  MessageSquare,
  ChevronDown,
  Lock
} from 'lucide-react';
import { safeFormatDate } from '@/lib/safe-date-format';
import { PreArrivalSubmission } from '@/hooks/useStaffGuestStay';

interface PreArrivalSubmissionCardProps {
  submission: PreArrivalSubmission | null;
  isLoading: boolean;
}

function formatTransferPreference(pref: string): string {
  const map: Record<string, string> = {
    'seaplane': 'Seaplane',
    'speedboat': 'Speedboat',
    'domestic_flight': 'Domestic Flight + Speedboat',
    'yacht': 'Private Yacht',
    'none': 'No Transfer Needed',
  };
  return map[pref] || pref;
}

function formatWaterComfortLevel(level: string): string {
  const map: Record<string, string> = {
    'none': 'Non-swimmer',
    'beginner': 'Beginner (shallow water)',
    'intermediate': 'Intermediate (can swim)',
    'advanced': 'Advanced (confident swimmer)',
    'expert': 'Expert (experienced diver/snorkeler)',
  };
  return map[level] || level;
}

function getOccasionEmoji(occasion: string): string {
  const map: Record<string, string> = {
    'honeymoon': '💒',
    'anniversary': '💕',
    'birthday': '🎂',
    'proposal': '💍',
    'babymoon': '👶',
    'retirement': '🎉',
    'graduation': '🎓',
    'celebration': '🥳',
  };
  return map[occasion.toLowerCase()] || '🎉';
}

function Section({ title, icon: Icon, children }: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <div className="pl-6 space-y-1">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight = false }: { 
  label: string; 
  value: string | null | undefined;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground min-w-[100px]">{label}:</span>
      <span className={highlight ? 'font-medium text-amber-700' : ''}>{value}</span>
    </div>
  );
}

interface SummaryBadge {
  label: string;
  className: string;
}

function getSummaryBadges(payload: PreArrivalSubmission['payload']): SummaryBadge[] {
  const badges: SummaryBadge[] = [];
  
  // Allergies badge
  if (payload.allergies) {
    badges.push({ 
      label: 'Allergies', 
      className: 'bg-amber-100 text-amber-800 border-amber-200' 
    });
  }
  
  // Late arrival badge (20:00 or later)
  if (payload.arrival_time) {
    const hour = parseInt(payload.arrival_time.split(':')[0], 10);
    if (!isNaN(hour) && hour >= 20) {
      badges.push({ 
        label: 'Late Arrival', 
        className: 'bg-orange-100 text-orange-800 border-orange-200' 
      });
    }
  }
  
  // Special occasions badge
  if (Array.isArray(payload.special_occasions) && payload.special_occasions.length > 0) {
    badges.push({ 
      label: `${payload.special_occasions.length} Occasion${payload.special_occasions.length > 1 ? 's' : ''}`, 
      className: 'bg-pink-100 text-pink-800 border-pink-200' 
    });
  }
  
  return badges;
}

export function PreArrivalSubmissionCard({ submission, isLoading }: PreArrivalSubmissionCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prearrivalTabEnabled = useFeatureEnabled('enable_guests_prearrival_tab');

  // If prearrival tab is disabled, don't render the card at all
  if (!prearrivalTabEnabled) {
    return null;
  }
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!submission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Pre-Arrival Submission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pre-arrival information submitted yet.</p>
            <p className="text-xs mt-1">The guest can submit this via their access link.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { payload, completedAt, updatedAt } = submission;
  const hasArrivalDetails = payload.arrival_time || payload.arrival_flight_number || payload.transfer_preference;
  const hasDietaryInfo = (Array.isArray(payload.dietary_preferences) && payload.dietary_preferences.length > 0) || payload.allergies;
  const hasOccasions = Array.isArray(payload.special_occasions) && payload.special_occasions.length > 0;
  const hasRequests = payload.special_requests;
  const hasWaterComfort = payload.water_comfort_level;
  
  const summaryBadges = getSummaryBadges(payload);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-5 w-5 flex-shrink-0" />
                <CardTitle className="text-lg">Pre-Arrival Submission</CardTitle>
                {/* Summary badges shown only when collapsed */}
                {!isOpen && summaryBadges.map((badge) => (
                  <Badge 
                    key={badge.label} 
                    variant="outline" 
                    className={cn("text-xs", badge.className)}
                  >
                    {badge.label}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {completedAt && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Completed {safeFormatDate(completedAt, 'MMM d')}
                  </Badge>
                )}
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Arrival Details */}
            {hasArrivalDetails && (
              <Section title="Arrival Details" icon={Plane}>
                <InfoItem label="Arrival Time" value={payload.arrival_time} />
                <InfoItem label="Flight" value={payload.arrival_flight_number} />
                {payload.transfer_preference && payload.transfer_preference !== 'none' && (
                  <InfoItem label="Transfer" value={formatTransferPreference(payload.transfer_preference)} />
                )}
              </Section>
            )}

            {/* Dietary & Allergies */}
            {hasDietaryInfo && (
              <Section title="Dietary & Allergies" icon={Utensils}>
                {payload.allergies && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="font-medium text-amber-700">Allergies: {payload.allergies}</span>
                  </div>
                )}
                {Array.isArray(payload.dietary_preferences) && payload.dietary_preferences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {payload.dietary_preferences.map((pref) => (
                      <Badge key={pref} variant="secondary" className="text-xs">
                        {pref}
                      </Badge>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* Water Comfort Level */}
            {hasWaterComfort && (
              <Section title="Water Comfort" icon={Droplets}>
                <p className="text-sm">{formatWaterComfortLevel(payload.water_comfort_level!)}</p>
              </Section>
            )}

            {/* Special Occasions */}
            {hasOccasions && (
              <Section title="Special Occasions" icon={PartyPopper}>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(payload.special_occasions) ? payload.special_occasions : []).map((occasion) => (
                    <Badge key={occasion} variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                      {getOccasionEmoji(occasion)} {occasion}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Special Requests */}
            {hasRequests && (
              <Section title="Special Requests" icon={MessageSquare}>
                <p className="text-sm bg-muted/50 rounded-md p-3 italic">
                  "{payload.special_requests}"
                </p>
              </Section>
            )}

            {/* Timestamps */}
            <div className="border-t pt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last updated: {safeFormatDate(updatedAt, 'MMM d, yyyy \'at\' h:mm a')}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
