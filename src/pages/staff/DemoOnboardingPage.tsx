import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Palette, 
  Calendar, 
  UtensilsCrossed, 
  Users, 
  Smartphone,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  completed: boolean;
}

export default function DemoOnboardingPage() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  const stepDefinitions = [
    { key: 'brand_setup', title: 'Set up your brand', description: 'Upload logo and customize resort name', icon: <Palette className="h-5 w-5" />, link: '/staff/settings/branding' },
    { key: 'create_activity', title: 'Create an activity', description: 'Add your first bookable experience', icon: <Calendar className="h-5 w-5" />, link: '/staff/activities' },
    { key: 'create_session', title: 'Schedule a session', description: 'Create a time slot for your activity', icon: <Calendar className="h-5 w-5" />, link: '/staff/sessions' },
    { key: 'create_restaurant', title: 'Add a restaurant', description: 'Set up a dining venue with time slots', icon: <UtensilsCrossed className="h-5 w-5" />, link: '/staff/restaurants' },
    { key: 'create_guest_pin', title: 'Create a guest', description: 'Add a guest and generate their portal PIN', icon: <Users className="h-5 w-5" />, link: '/staff/guests' },
    { key: 'guest_booking_done', title: 'Complete a guest booking', description: 'Open the guest portal and make a booking', icon: <Smartphone className="h-5 w-5" />, link: '/guest' },
  ];

  useEffect(() => {
    if (currentResort?.id) {
      loadProgress();
    }
  }, [currentResort?.id]);

  const loadProgress = async () => {
    if (!currentResort?.id) return;

    try {
      const { data: progress } = await supabase
        .from('onboarding_progress')
        .select('step_key, completed_at')
        .eq('tenant_id', currentResort.id);

      const completedKeys = new Set(progress?.filter(p => p.completed_at).map(p => p.step_key) || []);

      setSteps(stepDefinitions.map(step => ({
        ...step,
        completed: completedKeys.has(step.key),
      })));
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const markStepComplete = async (stepKey: string) => {
    if (!currentResort?.id) return;

    try {
      await supabase
        .from('onboarding_progress')
        .upsert({
          tenant_id: currentResort.id,
          step_key: stepKey,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,step_key' });

      setSteps(prev => prev.map(s => s.key === stepKey ? { ...s, completed: true } : s));
      toast.success('Step completed!');
    } catch (error) {
      console.error('Error marking step complete:', error);
    }
  };

  const handleStepClick = (step: OnboardingStep) => {
    if (step.link.startsWith('/guest')) {
      // Open guest portal in new tab
      window.open(step.link, '_blank');
    } else {
      navigate(step.link);
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const allComplete = completedCount === steps.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Demo Mode
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to your demo resort</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Complete these steps to experience how Propera streamlines your guest experience.
          We've pre-loaded some sample data to help you explore.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Your progress</span>
            <span className="text-sm text-muted-foreground">{completedCount} of {steps.length} complete</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card 
            key={step.key}
            className={`transition-all ${step.completed ? 'border-success/50 bg-success/5' : 'hover:border-primary/50 cursor-pointer'}`}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 p-3 rounded-full ${step.completed ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${step.completed ? 'text-success' : ''}`}>
                      {index + 1}. {step.title}
                    </h3>
                    {step.completed && <Badge variant="outline" className="border-success text-success">Done</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {!step.completed && (
                    <Button variant="ghost" size="sm" onClick={() => markStepComplete(step.key)}>
                      Mark done
                    </Button>
                  )}
                  <Button 
                    variant={step.completed ? "ghost" : "default"}
                    size="sm"
                    onClick={() => handleStepClick(step)}
                  >
                    {step.key === 'guest_booking_done' ? (
                      <>Open Guest Portal <ExternalLink className="ml-1 h-4 w-4" /></>
                    ) : (
                      <>Go <ArrowRight className="ml-1 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      {allComplete && (
        <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">You're ready to go live!</CardTitle>
            <CardDescription className="text-base">
              You've explored all the key features. Upgrade now to keep your data and unlock the full platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button size="lg" onClick={() => navigate('/staff/settings/subscription')}>
              <Sparkles className="mr-2 h-5 w-5" />
              Choose Your Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      <p className="text-center text-sm text-muted-foreground">
        Your demo expires in 14 days. Need help?{' '}
        <button className="text-primary hover:underline">Contact us</button>
      </p>
    </div>
  );
}
