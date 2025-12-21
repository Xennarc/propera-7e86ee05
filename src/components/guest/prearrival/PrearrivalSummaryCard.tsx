import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Check, 
  Edit2, 
  Plane, 
  Car, 
  UtensilsCrossed, 
  AlertTriangle, 
  PartyPopper, 
  Sparkles,
  Clock,
  MessageSquare,
  Waves
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PrearrivalProfile, PrearrivalSettings } from '@/hooks/usePrearrivalData';

interface PrearrivalSummaryCardProps {
  profile: PrearrivalProfile | null;
  settings: PrearrivalSettings;
  checkInDate: string;
  onEdit: () => void;
  editLocked?: boolean;
  editLockedMessage?: string;
  className?: string;
}

const TRANSFER_LABELS: Record<string, string> = {
  seaplane: 'Seaplane',
  speedboat: 'Speedboat',
  domestic_flight: 'Domestic flight + boat',
  unsure: 'Not decided yet',
  none: 'No transfer needed',
};

const WATER_COMFORT_LABELS: Record<string, string> = {
  confident: 'Confident swimmer',
  comfortable: 'Comfortable in water',
  beginner: 'Beginner/Learning',
  'non-swimmer': 'Non-swimmer',
};

export function PrearrivalSummaryCard({
  profile,
  settings,
  checkInDate,
  onEdit,
  editLocked = false,
  editLockedMessage,
  className,
}: PrearrivalSummaryCardProps) {
  const isComplete = profile?.prearrival_status === 'completed';
  const hasAnyData = profile && (
    profile.arrival_time ||
    profile.arrival_flight_number ||
    profile.transfer_preference ||
    (profile.dietary_preferences && profile.dietary_preferences.length > 0) ||
    profile.allergies ||
    profile.water_comfort_level ||
    (profile.special_occasions && profile.special_occasions.length > 0) ||
    profile.special_requests
  );

  // Empty state
  if (!hasAnyData) {
    return (
      <Card className={cn("guest-card border-dashed", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            Your Pre-Arrival Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground text-sm mb-4">
            You haven't shared any details yet. Help us prepare for your arrival!
          </p>
          <Button onClick={onEdit} size="sm">
            Get Started
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("guest-card", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="h-5 w-5 text-primary" />
            Your Pre-Arrival Summary
          </CardTitle>
          <Badge variant={isComplete ? 'success' : 'warning'} className="text-xs">
            {isComplete ? 'Completed' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Arrival Details */}
        {settings.show_arrival_details && (profile?.arrival_time || profile?.arrival_flight_number || profile?.transfer_preference) && (
          <Section title="Arrival Details" icon={Plane}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {profile?.arrival_time && (
                <InfoItem
                  label="Arrival Time"
                  value={profile.arrival_time.slice(0, 5)}
                  subLabel={format(parseISO(checkInDate), 'MMM d')}
                />
              )}
              {profile?.arrival_flight_number && (
                <InfoItem
                  label="Flight"
                  value={profile.arrival_flight_number}
                />
              )}
              {profile?.transfer_preference && (
                <InfoItem
                  label="Transfer"
                  value={TRANSFER_LABELS[profile.transfer_preference] || profile.transfer_preference}
                  icon={<Car className="h-3.5 w-3.5" />}
                />
              )}
            </div>
          </Section>
        )}

        {/* Preferences */}
        {settings.show_preferences && (
          (profile?.dietary_preferences && profile.dietary_preferences.length > 0) ||
          profile?.allergies ||
          profile?.water_comfort_level
        ) && (
          <Section title="Preferences" icon={UtensilsCrossed}>
            <div className="space-y-2">
              {profile?.allergies && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-destructive font-medium">{profile.allergies}</span>
                </div>
              )}
              {profile?.dietary_preferences && profile.dietary_preferences.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.dietary_preferences.map((pref: string) => (
                    <Badge key={pref} variant="secondary" className="text-xs">
                      {pref}
                    </Badge>
                  ))}
                </div>
              )}
              {profile?.water_comfort_level && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Waves className="h-3.5 w-3.5" />
                  <span>{WATER_COMFORT_LABELS[profile.water_comfort_level] || profile.water_comfort_level}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Special Occasions */}
        {settings.show_special_occasions && (
          (profile?.special_occasions && profile.special_occasions.length > 0) ||
          profile?.special_requests
        ) && (
          <Section title="Special Occasions" icon={PartyPopper}>
            <div className="space-y-2">
              {profile?.special_occasions && profile.special_occasions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.special_occasions.map((occ: string) => (
                    <Badge key={occ} className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {getOccasionEmoji(occ)} {occ}
                    </Badge>
                  ))}
                </div>
              )}
              {profile?.special_requests && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{profile.special_requests}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        <Separator />

        {/* Edit Action */}
        <div className="flex items-center justify-between">
          {editLocked ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{editLockedMessage || 'Changes locked close to arrival'}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              You can update your details anytime before arrival
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            disabled={editLocked}
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper Components
function Section({ title, icon: Icon, children }: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
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
  subLabel,
  icon 
}: { 
  label: string; 
  value: string; 
  subLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-sm flex items-center gap-1.5">
        {icon}
        {value}
        {subLabel && <span className="text-muted-foreground text-xs">• {subLabel}</span>}
      </dd>
    </div>
  );
}

function getOccasionEmoji(occasion: string): string {
  const emojiMap: Record<string, string> = {
    Honeymoon: '💑',
    Anniversary: '💍',
    Birthday: '🎂',
    Engagement: '💍',
    Babymoon: '🤰',
    'Family reunion': '👨‍👩‍👧‍👦',
    Retirement: '🎉',
  };
  return emojiMap[occasion] || '✨';
}
