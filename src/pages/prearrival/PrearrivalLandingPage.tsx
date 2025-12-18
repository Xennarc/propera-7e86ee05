import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  Plane, Calendar, Utensils, CheckCircle2, ChevronRight, 
  AlertCircle, Lock, Sparkles, Clock, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidatedData {
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  resort: {
    id: string;
    name: string;
    code: string;
    login_logo_url: string | null;
    login_primary_color: string | null;
    login_accent_color: string | null;
  };
  settings: {
    is_enabled: boolean;
    verification_mode: string;
    allow_activity_bookings: boolean;
    allow_dining_bookings: boolean;
    welcome_message: string | null;
  };
  profile: {
    prearrival_status: string;
    checkin_completed_at: string | null;
  } | null;
  link: {
    id: string;
    status: string;
    completed_at: string | null;
  };
}

export default function PrearrivalLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [validating, setValidating] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [lastName, setLastName] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [data, setData] = useState<ValidatedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate token (no verification yet)
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid link');
        setValidating(false);
        return;
      }

      try {
        // First, check if the link exists and is valid
        const { data: linkData, error: linkError } = await supabase
          .from('prearrival_tokens')
          .select(`
            id, token, status, expires_at, completed_at, revoked_at,
            guest_id, resort_id
          `)
          .eq('token', token)
          .maybeSingle();

        if (linkError || !linkData) {
          setError('This link is no longer available. Please contact the resort for assistance.');
          setValidating(false);
          return;
        }

        // Check if expired or revoked
        if (linkData.revoked_at || new Date(linkData.expires_at) < new Date()) {
          setError('This link has expired. Please contact your resort for a new one.');
          setValidating(false);
          return;
        }

        // Update last_opened_at
        await supabase
          .from('prearrival_tokens')
          .update({ last_opened_at: new Date().toISOString() })
          .eq('id', linkData.id);

        // Fetch resort settings to check verification mode
        const { data: settings } = await supabase
          .from('prearrival_settings')
          .select('verification_mode')
          .eq('resort_id', linkData.resort_id)
          .maybeSingle();

        const verificationMode = settings?.verification_mode || 'light';

        if (verificationMode === 'light') {
          setNeedsVerification(true);
          setValidating(false);
        } else {
          // No verification needed, validate directly
          await performValidation(token, '');
        }
      } catch (err) {
        console.error('Validation error:', err);
        setError('Something went wrong. Please try again.');
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const performValidation = async (tkn: string, lastNameValue: string) => {
    try {
      const { data: result, error: rpcError } = await supabase.rpc('validate_prearrival_link', {
        p_token: tkn,
        p_last_name: lastNameValue,
      });

      if (rpcError) throw rpcError;

      const validationResult = result as any;
      
      if (!validationResult?.success) {
        if (validationResult?.error === 'VERIFICATION_FAILED') {
          setVerificationError('The last name doesn\'t match our records. Please try again.');
          return;
        }
        setError(validationResult?.error || 'Validation failed');
        return;
      }

      setData(validationResult.data as ValidatedData);
      setNeedsVerification(false);
      setVerificationError(null);
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !lastName.trim()) return;

    setValidating(true);
    setVerificationError(null);
    await performValidation(token, lastName.trim());
  };

  // Navigate to wizard
  const handleStartCheckin = () => {
    navigate(`/prearrival/${token}/checkin`);
  };

  const handleExploreExperiences = () => {
    navigate(`/prearrival/${token}/experiences`);
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h2 className="text-xl font-bold mb-2">Link No Longer Available</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification screen
  if (needsVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Confirm it's you</h1>
            <p className="text-muted-foreground">
              For your security, please enter your last name to continue.
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    className="h-12"
                    autoFocus
                  />
                  {verificationError && (
                    <p className="text-sm text-destructive">{verificationError}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12"
                  disabled={!lastName.trim()}
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-3 w-3" />
            Secure link • Your information is protected
          </p>
        </div>
      </div>
    );
  }

  // Main landing page
  if (!data) return null;

  const { guest, resort, settings, profile, link } = data;
  const firstName = guest.full_name.split(' ')[0];
  const daysUntilArrival = differenceInDays(parseISO(guest.check_in_date), new Date());
  const isCompleted = link.completed_at || profile?.checkin_completed_at;

  const checklistItems = [
    { id: 'arrival', label: 'Arrival details', icon: Plane, done: profile?.prearrival_status !== 'not_started' },
    { id: 'preferences', label: 'Guest preferences', icon: Utensils, done: profile?.prearrival_status === 'completed' },
    { id: 'checkin', label: 'Online check-in', icon: CheckCircle2, done: !!isCompleted },
  ];

  if (settings.allow_activity_bookings || settings.allow_dining_bookings) {
    checklistItems.push({ id: 'plan', label: 'Plan your stay', icon: Calendar, done: false });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container max-w-4xl flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {resort.login_logo_url && (
              <img src={resort.login_logo_url} alt={resort.name} className="h-8 w-auto" />
            )}
            <span className="font-semibold">{resort.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container max-w-4xl px-4 py-8 md:py-12 space-y-8">
        {/* Welcome Card */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="text-lg text-muted-foreground">
            {settings.welcome_message || 'Your stay is almost here. Let\'s prepare everything for your arrival.'}
          </p>
        </div>

        {/* Countdown */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left space-y-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Arriving in</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl md:text-6xl font-bold text-primary">
                    {Math.max(0, daysUntilArrival)}
                  </span>
                  <span className="text-xl text-muted-foreground">
                    {daysUntilArrival === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(guest.check_in_date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="text-center md:text-right space-y-1">
                <Badge variant="outline" className="text-sm">
                  Room {guest.room_number}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(guest.check_in_date), 'MMM d')} – {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed State */}
        {isCompleted && (
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-success">You're all set!</h3>
                <p className="text-sm text-muted-foreground">
                  Your online check-in is complete. We're looking forward to welcoming you.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Checklist Preview */}
        {!isCompleted && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Complete your pre-arrival
              </h3>
              <div className="space-y-3">
                {checklistItems.map((item, index) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      item.done ? "bg-success/5" : "bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      item.done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      {item.done ? <CheckCircle2 className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                    </div>
                    <span className={cn(
                      "flex-1",
                      item.done && "text-muted-foreground line-through"
                    )}>
                      {item.label}
                    </span>
                    {!item.done && index === checklistItems.findIndex(i => !i.done) && (
                      <Badge variant="secondary" className="text-xs">Next</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            size="lg" 
            className="flex-1 h-14"
            onClick={handleStartCheckin}
          >
            {isCompleted ? 'View Check-in Details' : 'Start Online Check-in'}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
          
          {(settings.allow_activity_bookings || settings.allow_dining_bookings) && (
            <Button 
              size="lg" 
              variant="outline" 
              className="flex-1 h-14"
              onClick={handleExploreExperiences}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Explore Experiences
            </Button>
          )}
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secure link
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Takes 2–3 minutes
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Save & finish later
          </span>
        </div>
      </main>
    </div>
  );
}
