import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { 
  Building2, 
  Calendar, 
  UtensilsCrossed, 
  Users, 
  QrCode, 
  Check, 
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Shield
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StaffInviteDialog } from '@/components/staff/StaffInviteDialog';

interface OnboardingState {
  basics_done: boolean;
  activities_done: boolean;
  restaurants_done: boolean;
  staff_done: boolean;
  portal_done: boolean;
}

const STEPS = [
  { key: 'basics', label: 'Resort Basics', icon: Building2 },
  { key: 'activities', label: 'Activities', icon: Calendar },
  { key: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { key: 'staff', label: 'Invite Team', icon: Users },
  { key: 'portal', label: 'Guest Portal', icon: QrCode },
];

export default function ResortOnboardingPage() {
  const navigate = useNavigate();
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort, refetch } = useResort();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<OnboardingState>({
    basics_done: false,
    activities_done: false,
    restaurants_done: false,
    staff_done: false,
    portal_done: false,
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    activities: 0,
    sessions: 0,
    restaurants: 0,
    slots: 0,
    staff: 0,
  });

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
      // Fetch resort onboarding flags
      const { data: resort } = await supabase
        .from('resorts')
        .select('onboarding_basics_done, onboarding_activities_done, onboarding_restaurants_done, onboarding_staff_done, onboarding_portal_done')
        .eq('id', currentResort.id)
        .single();

      if (resort) {
        setState({
          basics_done: resort.onboarding_basics_done,
          activities_done: resort.onboarding_activities_done,
          restaurants_done: resort.onboarding_restaurants_done,
          staff_done: resort.onboarding_staff_done,
          portal_done: resort.onboarding_portal_done,
        });
      }

      // Fetch stats for completion checks
      const [activitiesRes, sessionsRes, restaurantsRes, slotsRes, staffRes] = await Promise.all([
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).eq('is_active', true),
        supabase.from('activity_sessions').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).eq('is_active', true),
        supabase.from('restaurant_time_slots').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('resort_memberships').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id),
      ]);

      setStats({
        activities: activitiesRes.count || 0,
        sessions: sessionsRes.count || 0,
        restaurants: restaurantsRes.count || 0,
        slots: slotsRes.count || 0,
        staff: staffRes.count || 0,
      });

      // Find first incomplete step
      const doneFlags = [
        resort?.onboarding_basics_done,
        resort?.onboarding_activities_done,
        resort?.onboarding_restaurants_done,
        resort?.onboarding_staff_done,
        resort?.onboarding_portal_done,
      ];
      const firstIncomplete = doneFlags.findIndex(f => !f);
      setActiveStep(firstIncomplete >= 0 ? firstIncomplete : 4);
    } catch (error) {
      console.error('Error fetching onboarding state:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStep = async (step: string, done: boolean) => {
    if (!currentResort) return;

    const fieldName = `onboarding_${step}_done`;
    const { error } = await supabase
      .from('resorts')
      .update({ [fieldName]: done })
      .eq('id', currentResort.id);

    if (error) {
      console.error('Error updating onboarding:', error);
      return;
    }

    setState(prev => ({ ...prev, [`${step}_done`]: done }));
    
    // Check if all steps are done
    const newState = { ...state, [`${step}_done`]: done };
    const allDone = Object.values(newState).every(v => v);
    
    if (allDone) {
      await supabase
        .from('resorts')
        .update({ onboarding_status: 'COMPLETED' })
        .eq('id', currentResort.id);
      
      await refetch();
      toast.success('Onboarding complete! Your resort is ready.');
    }
  };

  const handleBasicsComplete = async () => {
    await updateStep('basics', true);
    setActiveStep(1);
    toast.success('Basics saved!');
  };

  const handleActivitiesComplete = async () => {
    if (stats.activities > 0 && stats.sessions > 0) {
      await updateStep('activities', true);
      setActiveStep(2);
      toast.success('Activities setup complete!');
    } else {
      toast.error('Please create at least one activity with an upcoming session');
    }
  };

  const handleRestaurantsSkip = async () => {
    await updateStep('restaurants', true);
    setActiveStep(3);
    toast.info('Restaurants skipped - you can set them up later');
  };

  const handleRestaurantsComplete = async () => {
    if (stats.restaurants > 0 && stats.slots > 0) {
      await updateStep('restaurants', true);
      setActiveStep(3);
      toast.success('Restaurants setup complete!');
    } else {
      toast.error('Please create at least one restaurant with an upcoming time slot');
    }
  };

  const handleStaffComplete = async () => {
    await updateStep('staff', true);
    setActiveStep(4);
    toast.success('Team invites sent!');
  };

  const handlePortalViewed = async () => {
    await updateStep('portal', true);
    toast.success('Onboarding complete! 🎉');
  };

  const guestLoginUrl = currentResort ? `${window.location.origin}/resort/${currentResort.code}/guest/login` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(guestLoginUrl);
    toast.success('Link copied!');
  };

  const completedSteps = Object.values(state).filter(v => v).length;
  const progress = (completedSteps / 5) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentResort || !canAccess) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="You need Resort Admin access to complete onboarding"
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Setup {currentResort.name}</h1>
        <p className="text-muted-foreground">
          Complete these steps to get your resort ready for guests
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{completedSteps} of 5 steps completed</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Steps Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isDone = state[`${step.key}_done` as keyof OnboardingState];
          const isActive = activeStep === index;
          
          return (
            <Button
              key={step.key}
              variant={isActive ? 'default' : isDone ? 'secondary' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setActiveStep(index)}
            >
              {isDone ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <step.icon className="h-4 w-4 mr-1" />
              )}
              {step.label}
            </Button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        {activeStep === 0 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Resort Basics
                {state.basics_done && <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Done</Badge>}
              </CardTitle>
              <CardDescription>
                Review and update your resort's core information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{currentResort.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Code:</span>
                  <p className="font-medium">{currentResort.code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Timezone:</span>
                  <p className="font-medium">{currentResort.timezone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Currency:</span>
                  <p className="font-medium">{currentResort.currency}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/staff/settings/resorts')}>
                  Edit Resort Details
                </Button>
                <Button onClick={handleBasicsComplete}>
                  {state.basics_done ? 'Verified' : 'Looks Good'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {activeStep === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Activities Setup
                {state.activities_done && <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Done</Badge>}
              </CardTitle>
              <CardDescription>
                Create activities and schedule sessions so guests can start booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold">{stats.activities}</div>
                  <div className="text-sm text-muted-foreground">Active Activities</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold">{stats.sessions}</div>
                  <div className="text-sm text-muted-foreground">Upcoming Sessions</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                You need at least 1 activity with 1 upcoming session to complete this step.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/staff/activities')}>
                  Manage Activities
                </Button>
                <Button variant="outline" onClick={() => navigate('/staff/activities/sessions')}>
                  Manage Sessions
                </Button>
                <Button 
                  onClick={handleActivitiesComplete}
                  disabled={stats.activities === 0 || stats.sessions === 0}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {activeStep === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                Restaurants Setup
                {state.restaurants_done && <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Done</Badge>}
              </CardTitle>
              <CardDescription>
                Optional: Set up dining reservations if your resort offers restaurant bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold">{stats.restaurants}</div>
                  <div className="text-sm text-muted-foreground">Restaurants</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-3xl font-bold">{stats.slots}</div>
                  <div className="text-sm text-muted-foreground">Upcoming Time Slots</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => navigate('/staff/restaurants')}>
                  Manage Restaurants
                </Button>
                <Button variant="outline" onClick={() => navigate('/staff/restaurants/slots')}>
                  Manage Time Slots
                </Button>
                <Button variant="ghost" onClick={handleRestaurantsSkip}>
                  Skip for Now
                </Button>
                <Button 
                  onClick={handleRestaurantsComplete}
                  disabled={stats.restaurants === 0 || stats.slots === 0}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {activeStep === 3 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Invite Your Team
                {state.staff_done && <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Done</Badge>}
              </CardTitle>
              <CardDescription>
                Invite staff members so they can manage bookings and operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-3xl font-bold">{stats.staff}</div>
                <div className="text-sm text-muted-foreground">Team Members</div>
              </div>
              <p className="text-sm text-muted-foreground">
                Invite front office, activities, and F&B staff so they can start using the system.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                  Invite Staff Member
                </Button>
                <Button variant="outline" onClick={() => navigate('/staff/settings/resort-staff')}>
                  View Team
                </Button>
                <Button onClick={handleStaffComplete}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {activeStep === 4 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Guest Portal Link
                {state.portal_done && <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Done</Badge>}
              </CardTitle>
              <CardDescription>
                Share this link with guests so they can access the self-service portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-[1fr,auto] gap-6">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={guestLoginUrl}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-muted border rounded-md"
                    />
                    <Button variant="outline" size="icon" onClick={copyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add this QR code to villas, welcome letters, reception desks, and activity centers
                    so guests can easily access the portal.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-lg border">
                    <QRCodeSVG value={guestLoginUrl} size={120} />
                  </div>
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <Download className="h-3 w-3" />
                    Download QR
                  </Button>
                </div>
              </div>
              
              {!state.portal_done ? (
                <Button onClick={handlePortalViewed} className="w-full">
                  Complete Setup
                  <Check className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/staff')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                      Open Guest Portal
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>

      <StaffInviteDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchOnboardingState}
      />
    </div>
  );
}