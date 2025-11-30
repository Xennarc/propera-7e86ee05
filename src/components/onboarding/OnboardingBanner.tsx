import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Circle, ArrowRight } from 'lucide-react';

interface OnboardingState {
  status: string;
  basics_done: boolean;
  activities_done: boolean;
  restaurants_done: boolean;
  staff_done: boolean;
  portal_done: boolean;
}

const STEPS = [
  { key: 'basics_done', label: 'Basics' },
  { key: 'activities_done', label: 'Activities' },
  { key: 'restaurants_done', label: 'Restaurants' },
  { key: 'staff_done', label: 'Team' },
  { key: 'portal_done', label: 'Portal' },
];

export function OnboardingBanner() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  const canAccess = currentResort && (isSuperAdmin() || getResortRole(currentResort.id) === 'RESORT_ADMIN');

  useEffect(() => {
    if (currentResort && canAccess) {
      fetchOnboardingState();
    } else {
      setLoading(false);
    }
  }, [currentResort, canAccess]);

  const fetchOnboardingState = async () => {
    if (!currentResort) return;

    try {
      const { data } = await supabase
        .from('resorts')
        .select('onboarding_status, onboarding_basics_done, onboarding_activities_done, onboarding_restaurants_done, onboarding_staff_done, onboarding_portal_done')
        .eq('id', currentResort.id)
        .single();

      if (data) {
        setState({
          status: data.onboarding_status,
          basics_done: data.onboarding_basics_done,
          activities_done: data.onboarding_activities_done,
          restaurants_done: data.onboarding_restaurants_done,
          staff_done: data.onboarding_staff_done,
          portal_done: data.onboarding_portal_done,
        });
      }
    } catch (error) {
      console.error('Error fetching onboarding state:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !state || state.status === 'COMPLETED' || !canAccess) {
    return null;
  }

  const completedCount = STEPS.filter(step => state[step.key as keyof OnboardingState]).length;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Finish setting up {currentResort?.name}</h3>
              <span className="text-sm text-muted-foreground">
                {completedCount}/5 complete
              </span>
            </div>
            <div className="flex gap-3">
              {STEPS.map(step => {
                const isDone = state[step.key as keyof OnboardingState];
                return (
                  <div key={step.key} className="flex items-center gap-1 text-xs">
                    {isDone ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      <Circle className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={isDone ? 'text-success' : 'text-muted-foreground'}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/staff/onboarding">
              Continue Setup
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}