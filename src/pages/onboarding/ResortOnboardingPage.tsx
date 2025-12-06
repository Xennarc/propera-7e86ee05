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
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Lightbulb,
  Clock,
  Target
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StaffInviteDialog } from '@/components/staff/StaffInviteDialog';
import { cn } from '@/lib/utils';

interface OnboardingState {
  basics_done: boolean;
  activities_done: boolean;
  restaurants_done: boolean;
  staff_done: boolean;
  portal_done: boolean;
}

interface StepConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  tip: string;
  estimatedTime: string;
  subtasks: {
    key: string;
    label: string;
    check: (stats: Stats, state: OnboardingState) => boolean;
  }[];
}

interface Stats {
  activities: number;
  sessions: number;
  restaurants: number;
  slots: number;
  staff: number;
  guests: number;
}

const STEPS: StepConfig[] = [
  { 
    key: 'basics', 
    label: 'Resort Basics', 
    icon: Building2,
    description: 'Verify your resort information',
    tip: 'Make sure your timezone is correct—it affects all booking times!',
    estimatedTime: '2 min',
    subtasks: [
      { key: 'name', label: 'Resort name configured', check: () => true },
      { key: 'timezone', label: 'Timezone set', check: () => true },
      { key: 'currency', label: 'Currency selected', check: () => true },
    ]
  },
  { 
    key: 'activities', 
    label: 'Activities', 
    icon: Calendar,
    description: 'Set up activities guests can book',
    tip: 'Start with your top 3-5 activities. You can add more anytime.',
    estimatedTime: '10 min',
    subtasks: [
      { key: 'create_activity', label: 'Create at least 1 activity', check: (s) => s.activities >= 1 },
      { key: 'create_session', label: 'Schedule upcoming sessions', check: (s) => s.sessions >= 1 },
    ]
  },
  { 
    key: 'restaurants', 
    label: 'Restaurants', 
    icon: UtensilsCrossed,
    description: 'Configure dining reservations',
    tip: 'This step is optional—skip it if your resort doesn\'t take table bookings.',
    estimatedTime: '5 min',
    subtasks: [
      { key: 'create_restaurant', label: 'Add a restaurant', check: (s) => s.restaurants >= 1 },
      { key: 'create_slots', label: 'Set up time slots', check: (s) => s.slots >= 1 },
    ]
  },
  { 
    key: 'staff', 
    label: 'Invite Team', 
    icon: Users,
    description: 'Add your staff members',
    tip: 'Invite front office staff first—they\'ll handle most bookings.',
    estimatedTime: '5 min',
    subtasks: [
      { key: 'invite_staff', label: 'Invite team members', check: (s) => s.staff > 1 },
    ]
  },
  { 
    key: 'portal', 
    label: 'Guest Portal', 
    icon: QrCode,
    description: 'Share your guest booking link',
    tip: 'Print QR codes for rooms and reception—guests love the convenience!',
    estimatedTime: '2 min',
    subtasks: [
      { key: 'view_portal', label: 'Preview guest portal', check: (_, state) => state.portal_done },
      { key: 'copy_link', label: 'Copy or download QR', check: (_, state) => state.portal_done },
    ]
  },
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
  const [stats, setStats] = useState<Stats>({
    activities: 0,
    sessions: 0,
    restaurants: 0,
    slots: 0,
    staff: 0,
    guests: 0,
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);

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
      const [activitiesRes, sessionsRes, restaurantsRes, slotsRes, staffRes, guestsRes] = await Promise.all([
        supabase.from('activities').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).eq('is_active', true),
        supabase.from('activity_sessions').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).eq('is_active', true),
        supabase.from('restaurant_time_slots').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id).gte('date', new Date().toISOString().split('T')[0]),
        supabase.from('resort_memberships').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id),
        supabase.from('guests').select('id', { count: 'exact', head: true }).eq('resort_id', currentResort.id),
      ]);

      setStats({
        activities: activitiesRes.count || 0,
        sessions: sessionsRes.count || 0,
        restaurants: restaurantsRes.count || 0,
        slots: slotsRes.count || 0,
        staff: staffRes.count || 0,
        guests: guestsRes.count || 0,
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
      .update({ [fieldName]: done, onboarding_status: 'IN_PROGRESS' })
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
      toast.success('Setup complete! Your resort is ready for guests. 🎉');
    }
  };

  const handleStepComplete = async (stepKey: string, nextStep: number) => {
    await updateStep(stepKey, true);
    if (nextStep < STEPS.length) {
      setActiveStep(nextStep);
    }
    toast.success(`${STEPS.find(s => s.key === stepKey)?.label} complete!`);
  };

  const handleRestaurantsSkip = async () => {
    await updateStep('restaurants', true);
    setActiveStep(3);
    toast.info('Restaurants skipped—you can set them up later in Settings');
  };

  const guestLoginUrl = currentResort ? `${window.location.origin}/resort/${currentResort.code}/guest/login` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(guestLoginUrl);
    setLinkCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.fillRect(0, 0, 512, 512);
      ctx?.drawImage(img, 0, 0, 512, 512);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${currentResort?.code}-guest-portal-qr.png`;
      link.href = pngUrl;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    setQrDownloaded(true);
    toast.success('QR code downloaded!');
  };

  // Calculate overall progress including subtasks
  const calculateProgress = () => {
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    
    STEPS.forEach((step) => {
      step.subtasks.forEach((subtask) => {
        totalSubtasks++;
        if (subtask.check(stats, state)) {
          completedSubtasks++;
        }
      });
    });
    
    return Math.round((completedSubtasks / totalSubtasks) * 100);
  };

  const progress = calculateProgress();
  const completedSteps = Object.values(state).filter(v => v).length;

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

  const currentStep = STEPS[activeStep];
  const isStepDone = state[`${currentStep.key}_done` as keyof OnboardingState];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">Resort Setup</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Welcome to {currentResort.name}
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Complete these steps to get your resort ready for guests. It only takes about 20 minutes.
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="border-2">
        <CardContent className="py-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">Setup Progress</span>
                </div>
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">{completedSteps} of 5 steps done</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">~{Math.max(0, 20 - completedSteps * 4)} min left</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Steps Sidebar */}
        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const isDone = state[`${step.key}_done` as keyof OnboardingState];
            const isActive = activeStep === index;
            const StepIcon = step.icon;
            
            // Calculate subtask progress for this step
            const completedSubtasks = step.subtasks.filter(st => st.check(stats, state)).length;
            const totalSubtasks = step.subtasks.length;
            
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(index)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border-2 transition-all duration-200',
                  isActive 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : isDone 
                      ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isDone 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' 
                      : isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted-foreground/10 text-muted-foreground'
                  )}>
                    {isDone ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-medium truncate',
                        isActive ? 'text-primary' : isDone ? 'text-green-700 dark:text-green-400' : ''
                      )}>
                        {step.label}
                      </span>
                      {isDone && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {isDone ? 'Completed' : `${completedSubtasks}/${totalSubtasks} tasks`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-4">
          {/* Step Header Card */}
          <Card className="overflow-hidden">
            <div className={cn(
              'h-1.5',
              isStepDone ? 'bg-green-500' : 'bg-primary'
            )} />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Step {activeStep + 1} of 5
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {currentStep.estimatedTime}
                    </Badge>
                  </div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <currentStep.icon className="h-5 w-5 text-primary" />
                    {currentStep.label}
                    {isStepDone && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {currentStep.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            {/* Tip Banner */}
            <div className="mx-6 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{currentStep.tip}</p>
              </div>
            </div>

            <CardContent className="space-y-6">
              {/* Subtasks Checklist */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Checklist</span>
                <div className="space-y-2">
                  {currentStep.subtasks.map((subtask) => {
                    const isComplete = subtask.check(stats, state);
                    return (
                      <div
                        key={subtask.key}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          isComplete 
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
                            : 'bg-muted/30 border-border'
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={cn(
                          'text-sm',
                          isComplete ? 'text-green-700 dark:text-green-400' : ''
                        )}>
                          {subtask.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-specific Content */}
              {activeStep === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Name', value: currentResort.name },
                      { label: 'Code', value: currentResort.code },
                      { label: 'Timezone', value: currentResort.timezone },
                      { label: 'Currency', value: currentResort.currency },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-muted/50 rounded-lg">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <p className="font-medium truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/staff/settings/resorts')}>
                      Edit Details
                    </Button>
                    <Button onClick={() => handleStepComplete('basics', 1)}>
                      {isStepDone ? 'Verified' : 'Looks Good'}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-primary">{stats.activities}</div>
                      <div className="text-sm text-muted-foreground">Active Activities</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-primary">{stats.sessions}</div>
                      <div className="text-sm text-muted-foreground">Upcoming Sessions</div>
                    </div>
                  </div>
                  {stats.activities === 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Create at least 1 activity with 1 upcoming session to continue.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/staff/activities')}>
                      Manage Activities
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/staff/activities/sessions/new')}>
                      Create Sessions
                    </Button>
                    <Button 
                      onClick={() => handleStepComplete('activities', 2)}
                      disabled={stats.activities === 0 || stats.sessions === 0}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-primary">{stats.restaurants}</div>
                      <div className="text-sm text-muted-foreground">Restaurants</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-xl text-center">
                      <div className="text-3xl font-bold text-primary">{stats.slots}</div>
                      <div className="text-sm text-muted-foreground">Upcoming Time Slots</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate('/staff/restaurants')}>
                      Manage Restaurants
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/staff/restaurants/slots/new')}>
                      Create Time Slots
                    </Button>
                    <Button variant="ghost" onClick={handleRestaurantsSkip}>
                      Skip for Now
                    </Button>
                    <Button 
                      onClick={() => handleStepComplete('restaurants', 3)}
                      disabled={stats.restaurants === 0 || stats.slots === 0}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-xl text-center">
                    <div className="text-3xl font-bold text-primary">{stats.staff}</div>
                    <div className="text-sm text-muted-foreground">Team Members</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Invite front office, activities, and F&B staff so they can manage bookings.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                      Invite Staff Member
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/staff/settings/resort-staff')}>
                      View Team
                    </Button>
                    <Button onClick={() => handleStepComplete('staff', 4)}>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={guestLoginUrl}
                          className="flex-1 px-3 py-2 text-sm font-mono bg-muted border rounded-lg"
                        />
                        <Button 
                          variant={linkCopied ? 'secondary' : 'outline'} 
                          size="icon" 
                          onClick={copyLink}
                        >
                          {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-white rounded-xl border-2 shadow-sm">
                        <QRCodeSVG id="qr-code-svg" value={guestLoginUrl} size={140} />
                      </div>
                      <Button 
                        variant={qrDownloaded ? 'secondary' : 'outline'} 
                        size="sm" 
                        onClick={downloadQR}
                        className="gap-1.5"
                      >
                        {qrDownloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                        Download QR
                      </Button>
                    </div>
                  </div>
                  
                  {!isStepDone ? (
                    <Button onClick={() => handleStepComplete('portal', 4)} className="w-full" size="lg">
                      Complete Setup
                      <Sparkles className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => navigate('/staff')}>
                        Go to Dashboard
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/staff/settings/branding')}>
                        Customize Branding
                      </Button>
                      <Button asChild>
                        <a href={guestLoginUrl} target="_blank" rel="noopener noreferrer">
                          Open Guest Portal
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Banner */}
          {completedSteps === 5 && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-900">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Setup Complete!</h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your resort is ready to accept guest bookings. You can always update settings later.
                    </p>
                  </div>
                  <Button onClick={() => navigate('/staff')} className="bg-green-600 hover:bg-green-700">
                    Go to Dashboard
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <StaffInviteDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchOnboardingState}
      />
    </div>
  );
}
