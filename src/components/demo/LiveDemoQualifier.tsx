import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Play, Video, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveDemoQualifierProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: 'gm', label: 'GM', score: 30 },
  { value: 'operations', label: 'Operations', score: 25 },
  { value: 'activities', label: 'Activities', score: 15 },
  { value: 'spa', label: 'Spa', score: 15 },
  { value: 'fnb', label: 'F&B', score: 15 },
  { value: 'it', label: 'IT', score: 10 },
  { value: 'other', label: 'Other', score: 5 },
];

const GOALS = [
  { value: 'reduce_calls', label: 'Reduce calls', score: 10 },
  { value: 'improve_scheduling', label: 'Improve scheduling', score: 10 },
  { value: 'increase_revenue', label: 'Increase revenue', score: 15 },
  { value: 'replace_tool', label: 'Replace current tool', score: 20 },
  { value: 'other', label: 'Other', score: 5 },
];

const TIMELINES = [
  { value: 'this_month', label: 'This month', score: 30 },
  { value: 'this_quarter', label: 'This quarter', score: 20 },
  { value: 'exploring', label: 'Exploring', score: 5 },
];

const CURRENT_SYSTEMS = [
  { value: 'whatsapp', label: 'WhatsApp', score: 5 },
  { value: 'excel', label: 'Excel', score: 5 },
  { value: 'other_system', label: 'Another system', score: 10 },
  { value: 'starting_fresh', label: 'Starting fresh', score: 10 },
];

const ROOM_RANGES = [
  { value: '1-50', label: '1–50', score: 5 },
  { value: '51-100', label: '51–100', score: 10 },
  { value: '101-200', label: '101–200', score: 15 },
  { value: '200+', label: '200+', score: 25 },
];

const LEAD_SCORE_THRESHOLD = 50;

export function LiveDemoQualifier({ open, onOpenChange }: LiveDemoQualifierProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'qualified' | 'alternative' | 'no_slots'>('form');
  
  const [formData, setFormData] = useState({
    role: '',
    goal: '',
    timeline: '',
    currentSystem: '',
    roomsRange: '',
  });

  const calculateScore = () => {
    let score = 0;
    const roleData = ROLES.find(r => r.value === formData.role);
    const goalData = GOALS.find(g => g.value === formData.goal);
    const timelineData = TIMELINES.find(t => t.value === formData.timeline);
    const roomsData = ROOM_RANGES.find(r => r.value === formData.roomsRange);
    
    if (roleData) score += roleData.score;
    if (goalData) score += goalData.score;
    if (timelineData) score += timelineData.score;
    if (roomsData) score += roomsData.score;
    
    return score;
  };

  const isFormValid = () => {
    return formData.role && formData.goal && formData.timeline && formData.roomsRange;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      const score = calculateScore();

      // Determine next step based on score
      if (score >= LEAD_SCORE_THRESHOLD) {
        setStep('qualified');
      } else {
        setStep('alternative');
      }
    } catch (error: any) {
      console.error('Qualifier error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('form');
      setFormData({
        role: '',
        goal: '',
        timeline: '',
        currentSystem: '',
        roomsRange: '',
      });
      onOpenChange(false);
    }
  };

  const triggerDemoWizard = () => {
    handleClose();
    setTimeout(() => {
      document.querySelector<HTMLButtonElement>('[data-trigger-demo]')?.click();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Book a walkthrough</DialogTitle>
              <DialogDescription>
                A few quick questions so we can tailor the call to your operation.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Your role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Goal for this call</Label>
                <Select 
                  value={formData.goal} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, goal: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What do you want to achieve?" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map(g => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Go-live timeline</Label>
                  <Select 
                    value={formData.timeline} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="When?" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMELINES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Resort size</Label>
                  <Select 
                    value={formData.roomsRange} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roomsRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOM_RANGES.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current setup</Label>
                <Select 
                  value={formData.currentSystem} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currentSystem: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What do you use now?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENT_SYSTEMS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full font-semibold" 
                size="lg"
                disabled={!isFormValid() || isSubmitting}
                data-trigger-qualifier
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to calendar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                If a live call isn't needed, we'll guide you to the instant demo instead.
              </p>
            </form>
          </>
        )}

        {step === 'qualified' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">You're all set!</DialogTitle>
              <DialogDescription>
                Pick a time that works for you. We'll send a calendar invite with a video call link.
              </DialogDescription>
            </DialogHeader>
            
            <Card className="bg-primary/5 border-primary/20 mb-6">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
                <Button className="rounded-full font-semibold" size="lg" asChild>
                  <a 
                    href="https://calendly.com/propera/demo" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule 30-min Call
                  </a>
                </Button>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              Or try the self-serve demo in the meantime — it only takes 10 minutes.
            </p>
            <Button 
              variant="link" 
              className="w-full mt-2"
              onClick={triggerDemoWizard}
            >
              Try instant demo instead
            </Button>
          </div>
        )}

        {step === 'alternative' && (
          <div className="py-8">
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">Thanks for your interest!</DialogTitle>
              <DialogDescription>
                Here are some great ways to explore Propera at your own pace.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <a href="https://www.youtube.com/watch?v=propera-demo" target="_blank" rel="noopener noreferrer" className="block">
                <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Video className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">Watch 3-min Demo Video</h4>
                      <p className="text-sm text-muted-foreground">See Propera in action without signing up</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  </CardContent>
                </Card>
              </a>

              <Card 
                className="hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={triggerDemoWizard}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Try Propera Now</h4>
                    <p className="text-sm text-muted-foreground">Get instant access to a demo resort</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-6">
              We've saved your details. Our team may reach out if we think Propera is a great fit.
            </p>
          </div>
        )}

        {step === 'no_slots' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">No slots available right now.</DialogTitle>
              <DialogDescription>
                Use the instant demo — and we'll follow up with the next opening.
              </DialogDescription>
            </DialogHeader>

            <Button 
              size="lg" 
              className="w-full rounded-full font-semibold"
              onClick={triggerDemoWizard}
            >
              <Play className="mr-2 h-4 w-4" />
              Try Propera Now
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
