import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Play, Video, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LiveDemoQualifierProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: 'owner', label: 'Owner / GM', score: 30 },
  { value: 'operations_director', label: 'Operations Director', score: 25 },
  { value: 'department_head', label: 'Department Head', score: 15 },
  { value: 'front_office', label: 'Front Office Manager', score: 10 },
  { value: 'other', label: 'Other', score: 5 },
];

const TIMELINES = [
  { value: 'immediate', label: 'Ready to start now', score: 30 },
  { value: '1-3_months', label: 'Within 1-3 months', score: 20 },
  { value: '3-6_months', label: 'Within 3-6 months', score: 10 },
  { value: 'exploring', label: 'Just exploring options', score: 5 },
];

const ROOM_RANGES = [
  { value: '1-50', label: '1-50 rooms', score: 5 },
  { value: '51-100', label: '51-100 rooms', score: 10 },
  { value: '101-200', label: '101-200 rooms', score: 15 },
  { value: '201-500', label: '201-500 rooms', score: 20 },
  { value: '500+', label: '500+ rooms', score: 25 },
];

const CURRENT_SYSTEMS = [
  { value: 'spreadsheets', label: 'Spreadsheets / Paper' },
  { value: 'pms_basic', label: 'Basic PMS module' },
  { value: 'other_software', label: 'Other booking software' },
  { value: 'custom', label: 'Custom built system' },
  { value: 'none', label: 'No formal system' },
];

const LEAD_SCORE_THRESHOLD = 50;

export function LiveDemoQualifier({ open, onOpenChange }: LiveDemoQualifierProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'qualified' | 'alternative'>('form');
  const [leadScore, setLeadScore] = useState(0);
  
  const [formData, setFormData] = useState({
    email: '',
    resortName: '',
    role: '',
    timeline: '',
    roomsRange: '',
    currentSystem: '',
    primaryPain: '',
  });

  const calculateScore = () => {
    let score = 0;
    const roleData = ROLES.find(r => r.value === formData.role);
    const timelineData = TIMELINES.find(t => t.value === formData.timeline);
    const roomsData = ROOM_RANGES.find(r => r.value === formData.roomsRange);
    
    if (roleData) score += roleData.score;
    if (timelineData) score += timelineData.score;
    if (roomsData) score += roomsData.score;
    
    return score;
  };

  const isFormValid = () => {
    return (
      formData.email.includes('@') &&
      formData.resortName.length >= 2 &&
      formData.role &&
      formData.timeline &&
      formData.roomsRange
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      const score = calculateScore();
      setLeadScore(score);

      // Create lead record
      const { error } = await supabase.from('leads').upsert({
        email: formData.email,
        resort_name: formData.resortName,
        role: formData.role,
        timeline: formData.timeline,
        rooms_range: formData.roomsRange,
        current_system: formData.currentSystem,
        primary_pain: formData.primaryPain,
        lead_score: score,
        status: 'new',
      }, {
        onConflict: 'email',
      });

      if (error) throw error;

      // Log event
      const { data: leadData } = await supabase
        .from('leads')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (leadData) {
        await supabase.from('lead_events').insert({
          lead_id: leadData.id,
          event_type: 'live_demo_requested',
          meta: { score, formData },
        });
      }

      // Determine next step based on score
      if (score >= LEAD_SCORE_THRESHOLD) {
        setStep('qualified');
        toast.success('Great! You qualify for a live walkthrough.');
      } else {
        setStep('alternative');
      }
    } catch (error: any) {
      console.error('Lead creation error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('form');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Book a Live Walkthrough</DialogTitle>
              <DialogDescription>
                Help us understand your needs so we can tailor the demo to your resort.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@resort.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resortName">Resort Name</Label>
                  <Input
                    id="resortName"
                    placeholder="Your resort"
                    value={formData.resortName}
                    onChange={(e) => setFormData(prev => ({ ...prev, resortName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Role</Label>
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
                  <Label>Timeline</Label>
                  <Select 
                    value={formData.timeline} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, timeline: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="When to start?" />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Resort Size</Label>
                  <Select 
                    value={formData.roomsRange} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roomsRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Number of rooms" />
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

                <div className="space-y-2">
                  <Label>Current System</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryPain">What's your biggest challenge today? (optional)</Label>
                <Textarea
                  id="primaryPain"
                  placeholder="e.g., Double bookings, no visibility into capacity, manual confirmations..."
                  value={formData.primaryPain}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryPain: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-full font-semibold" 
                size="lg"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {step === 'qualified' && (
          <div className="py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <DialogHeader className="text-center mb-6">
              <DialogTitle className="text-2xl">You're all set!</DialogTitle>
              <DialogDescription>
                Based on your needs, we'd love to give you a personalized walkthrough.
              </DialogDescription>
            </DialogHeader>
            
            <Card className="bg-primary/5 border-primary/20 mb-6">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Pick a time that works for you. We'll send a calendar invite with a video call link.
                </p>
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
                onClick={() => {
                  handleClose();
                  // Trigger demo wizard after closing this dialog
                  setTimeout(() => {
                    document.querySelector<HTMLButtonElement>('[data-trigger-demo]')?.click();
                  }, 100);
                }}
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
      </DialogContent>
    </Dialog>
  );
}
