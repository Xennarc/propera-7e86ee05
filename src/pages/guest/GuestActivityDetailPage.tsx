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
  Star,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { IconActivities } from '@/components/icons/ProperaIcons';
import { getCategoryConfig } from '@/lib/activity-category-config';

const difficultyConfig: Record<DifficultyLevel, { label: string; color: string; bg: string }> = {
  EASY: { 
    label: 'Easy', 
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
  },
  MODERATE: { 
    label: 'Moderate', 
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
  },
  ADVANCED: { 
    label: 'Advanced', 
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
  },
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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
      <div className="space-y-4 -mx-4 -mt-4">
        {/* Hero skeleton */}
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="px-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
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
  const categoryConfig = getCategoryConfig(activity.category);
  const CategoryIcon = categoryConfig.icon;
  const difficulty = activity.difficulty_level ? difficultyConfig[activity.difficulty_level] : null;

  return (
    <div className="pb-28 -mx-4 -mt-4">
      {/* Hero Section */}
      <div className="relative">
        {/* Hero Background with gradient */}
        <div className={`h-72 relative overflow-hidden ${categoryConfig.bgClass}`}>
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-8 left-8">
              <CategoryIcon className="h-32 w-32" />
            </div>
            <div className="absolute bottom-4 right-4">
              <CategoryIcon className="h-48 w-48 rotate-12" />
            </div>
          </div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-lg z-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Category icon */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <div className={`h-20 w-20 rounded-2xl flex items-center justify-center shadow-xl ${categoryConfig.bgClass} border border-white/20`}>
              <CategoryIcon className={`h-10 w-10 ${categoryConfig.colorClass}`} />
            </div>
          </div>
        </div>
        
        {/* Title section overlapping hero */}
        <div className="px-4 -mt-12 relative z-10">
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{activity.name}</h1>
            
            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${categoryConfig.chipClass} gap-1.5`}
              >
                <CategoryIcon className="h-3 w-3" />
                {categoryConfig.label}
              </Badge>
              
              {difficulty && (
                <Badge 
                  variant="outline" 
                  className={`${difficulty.bg} ${difficulty.color} border`}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {difficulty.label}
                </Badge>
              )}
              
              {activity.suitable_for_non_swimmers && (
                <Badge variant="outline" className="gap-1 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800">
                  <Waves className="h-3 w-3" />
                  Non-swimmers OK
                </Badge>
              )}
            </div>
            
            {/* Short description */}
            {activity.short_description && (
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {activity.short_description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="shadow-sm border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-bold text-foreground">{formatDuration(activity.duration_minutes)}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-gradient-to-br from-orchid/5 to-orchid/10">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-orchid" />
              <p className="text-xs text-muted-foreground">Max Group</p>
              <p className="font-bold text-foreground">{activity.max_pax_per_booking}</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-0 bg-gradient-to-br from-sunset/5 to-sunset/10">
            <CardContent className="p-4 text-center">
              <MapPin className="h-5 w-5 mx-auto mb-1 text-sunset" />
              <p className="text-xs text-muted-foreground">Age</p>
              <p className="font-bold text-foreground">{ageRange || 'All ages'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {activity.full_description && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${categoryConfig.bgClass}`}>
                  <Star className={`h-4 w-4 ${categoryConfig.colorClass}`} />
                </div>
                <h2 className="font-bold text-foreground">About this experience</h2>
              </div>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {activity.full_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <Card className="shadow-sm overflow-hidden border-emerald-100 dark:border-emerald-900/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="font-bold text-foreground">Highlights</h2>
              </div>
              <ul className="space-y-3">
                {highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-muted-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* What's Included */}
        {activity.includes && (
          <Card className="shadow-sm overflow-hidden border-lagoon/20 dark:border-lagoon/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-lagoon/10">
                  <CheckCircle2 className="h-4 w-4 text-lagoon" />
                </div>
                <h2 className="font-bold text-foreground">What's included</h2>
              </div>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {activity.includes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Health & Safety */}
        {activity.health_and_safety_notes && (
          <Card className="shadow-sm overflow-hidden border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-900/50">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="font-bold text-foreground">Health & Safety</h2>
              </div>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {activity.health_and_safety_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cancellation Policy */}
        {activity.cancellation_policy_text && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-bold text-foreground">Cancellation Policy</h2>
              </div>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {activity.cancellation_policy_text}
              </p>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orchid/10">
                  <HelpCircle className="h-4 w-4 text-orchid" />
                </div>
                <h2 className="font-bold text-foreground">Common Questions</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="border-b-0 last:border-0">
                    <AccordionTrigger className="text-left hover:no-underline py-3 text-sm font-medium">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-4">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Swimming requirement notice */}
        {activity.is_swimming_required && (
          <Card className="shadow-sm overflow-hidden border-sky-200 dark:border-sky-800/50 bg-gradient-to-br from-sky-50/50 to-transparent dark:from-sky-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 shrink-0">
                <Waves className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Swimming Required</p>
                <p className="text-xs text-muted-foreground">Participants must be comfortable swimming in open water</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Book Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-50">
        <div className="max-w-lg mx-auto">
          {sessions && sessions.length > 0 ? (
            <Link to={`/resort/${code}/guest/activities`}>
              <Button className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg gap-2">
                <IconActivities className="h-5 w-5" />
                Book this activity
              </Button>
            </Link>
          ) : (
            <Button 
              className="w-full h-14 text-lg font-semibold rounded-2xl" 
              variant="secondary"
              disabled
            >
              No sessions available
            </Button>
          )}
          {sessions && sessions.length > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{sessions.length}</span> session{sessions.length !== 1 ? 's' : ''} available during your stay
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
