import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Activity, DifficultyLevel, ActivityFaq } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Shield,
  Calendar,
  HelpCircle,
  Waves,
} from 'lucide-react';
import { IconActivities } from '@/components/icons/ProperaIcons';

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MODERATE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  ADVANCED: 'Advanced',
};

export default function GuestActivityDetailPage() {
  const { code, activityId } = useParams<{ code: string; activityId: string }>();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();

  const { data: activity, isLoading, error } = useQuery({
    queryKey: ['guest-activity-detail', activityId, guest?.resortId],
    queryFn: async () => {
      if (!guest || !activityId) return null;
      
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .eq('resort_id', guest.resortId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as Activity;
    },
    enabled: !!guest && !!activityId,
  });

  // Fetch available sessions for booking link
  const { data: sessions } = useQuery({
    queryKey: ['guest-activity-sessions', activityId, guest?.guestId],
    queryFn: async () => {
      if (!guest) return [];
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      // Filter sessions for this activity
      return (data as any[])?.filter((s: any) => s.activity_id === activityId) || [];
    },
    enabled: !!guest && !!activityId,
  });

  if (!guest) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view this activity.</p>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} min` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const getAgeRange = () => {
    if (activity?.age_min && activity?.max_age) {
      return `${activity.age_min} - ${activity.max_age} years`;
    } else if (activity?.age_min) {
      return `${activity.age_min}+ years`;
    } else if (activity?.max_age) {
      return `Up to ${activity.max_age} years`;
    }
    return null;
  };

  // Parse highlights - could be JSON array or string
  const parseHighlights = (): string[] => {
    if (!activity?.highlights) return [];
    if (Array.isArray(activity.highlights)) return activity.highlights;
    if (typeof activity.highlights === 'string') {
      try {
        const parsed = JSON.parse(activity.highlights);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return activity.highlights.split('\n').filter(Boolean);
      }
    }
    return [];
  };

  // Parse FAQ
  const parseFaq = (): ActivityFaq[] => {
    if (!activity?.faq) return [];
    if (Array.isArray(activity.faq)) return activity.faq as ActivityFaq[];
    if (typeof activity.faq === 'string') {
      try {
        const parsed = JSON.parse(activity.faq);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Activity not found</h3>
            <p className="text-sm text-muted-foreground">
              This activity may no longer be available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const highlights = parseHighlights();
  const faq = parseFaq();
  const ageRange = getAgeRange();

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0 mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {activity.difficulty_level && (
              <Badge 
                variant="secondary" 
                className={difficultyColors[activity.difficulty_level]}
              >
                {difficultyLabels[activity.difficulty_level]}
              </Badge>
            )}
            {activity.suitable_for_non_swimmers && (
              <Badge variant="outline" className="gap-1">
                <Waves className="h-3 w-3" />
                Non-swimmers welcome
              </Badge>
            )}
            {activity.requires_approval && (
              <Badge variant="secondary">On request</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{activity.name}</h1>
        </div>
      </div>

      {/* Quick Info */}
      <Card className="shadow-soft">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {activity.duration_minutes && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-semibold text-sm">{formatDuration(activity.duration_minutes)}</p>
                </div>
              </div>
            )}
            {ageRange && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-semibold text-sm">{ageRange}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max group</p>
                <p className="font-semibold text-sm">{activity.max_pax_per_booking} guests</p>
              </div>
            </div>
            {activity.is_swimming_required && (
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Waves className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requirement</p>
                  <p className="font-semibold text-sm">Swimming</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {activity.full_description && (
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <h2 className="font-bold text-foreground mb-3">About this activity</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {activity.full_description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <h2 className="font-bold text-foreground mb-3">Highlights</h2>
            <ul className="space-y-2">
              {highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* What's Included */}
      {activity.includes && (
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <h2 className="font-bold text-foreground mb-3">What's included</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {activity.includes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Health & Safety */}
      {activity.health_and_safety_notes && (
        <Card className="shadow-soft border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-foreground">Health & Safety</h2>
            </div>
            <p className="text-muted-foreground whitespace-pre-line">
              {activity.health_and_safety_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Policy */}
      {activity.cancellation_policy_text && (
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground">Cancellation Policy</h2>
            </div>
            <p className="text-muted-foreground whitespace-pre-line">
              {activity.cancellation_policy_text}
            </p>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground">Frequently Asked Questions</h2>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faq.map((item, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Sticky Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-50">
        <div className="max-w-lg mx-auto">
          {sessions && sessions.length > 0 ? (
            <Link to="/guest/activities">
              <Button className="w-full h-12 text-lg font-semibold rounded-xl shadow-lg">
                <IconActivities className="h-5 w-5 mr-2" />
                Book this activity
              </Button>
            </Link>
          ) : (
            <Button 
              className="w-full h-12 text-lg font-semibold rounded-xl" 
              variant="secondary"
              disabled
            >
              No sessions available
            </Button>
          )}
          {sessions && sessions.length > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} available during your stay
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
