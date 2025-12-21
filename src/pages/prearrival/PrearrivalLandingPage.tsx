import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { format, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import { 
  Plane, Calendar, Utensils, CheckCircle2, ChevronRight, 
  AlertCircle, Sparkles, Clock, Shield, PartyPopper, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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

// Guest journey states
type GuestState = 
  | 'LOADING'
  | 'ERROR'
  | 'NEEDS_VERIFICATION'
  | 'PRE_ARRIVAL_NOT_STARTED'
  | 'PRE_ARRIVAL_IN_PROGRESS'
  | 'PRE_ARRIVAL_COMPLETED'
  | 'IN_STAY'
  | 'POST_STAY';

function getGuestState(data: ValidatedData | null, checkInDate: string, checkOutDate: string): GuestState {
  if (!data) return 'LOADING';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);
  
  // Post stay: checkout date has passed
  if (isPast(checkOut) && !isToday(checkOut)) {
    return 'POST_STAY';
  }
  
  // In stay: on or after check-in, on or before checkout
  if ((isToday(checkIn) || isPast(checkIn)) && !isPast(checkOut)) {
    return 'IN_STAY';
  }
  
  // Pre-arrival states
  const isCompleted = data.link.completed_at || data.profile?.checkin_completed_at;
  if (isCompleted) return 'PRE_ARRIVAL_COMPLETED';
  
  if (data.profile?.prearrival_status === 'partial') return 'PRE_ARRIVAL_IN_PROGRESS';
  
  return 'PRE_ARRIVAL_NOT_STARTED';
}

export default function PrearrivalLandingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [validating, setValidating] = useState(true);
  const [data, setData] = useState<ValidatedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resortBranding, setResortBranding] = useState<{
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  } | null>(null);

  // Validate token and load directly
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
            guest_id, resort_id,
            resorts (name, login_logo_url, login_primary_color)
          `)
          .eq('token', token)
          .maybeSingle();

        if (linkError || !linkData) {
          setError('This link is no longer available. Please contact the resort for assistance.');
          setValidating(false);
          return;
        }

        // Set resort branding immediately for fast load
        const resort = linkData.resorts as any;
        if (resort) {
          setResortBranding({
            name: resort.name,
            logo_url: resort.login_logo_url,
            primary_color: resort.login_primary_color,
          });
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

        // Validate directly without verification
        await performValidation(token);
      } catch (err) {
        console.error('Validation error:', err);
        setError('Something went wrong. Please try again.');
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const performValidation = useCallback(async (tkn: string) => {
    try {
      // Skip verification - pass empty string for last name
      const { data: result, error: rpcError } = await supabase.rpc('validate_prearrival_link', {
        p_token: tkn,
        p_last_name: '',
      });

      if (rpcError) throw rpcError;

      const validationResult = result as any;
      
      if (!validationResult?.success) {
        // Ignore verification failures since we're skipping verification
        if (validationResult?.error === 'VERIFICATION_FAILED') {
          // This shouldn't happen with empty last name, but handle gracefully
          setError('Unable to access your pre-arrival information. Please contact the resort.');
          return;
        }
        setError(validationResult?.error || 'Validation failed');
        return;
      }

      const validatedData = validationResult.data as ValidatedData;
      
      // Check if guest is IN_STAY - redirect to guest portal
      const guestState = getGuestState(validatedData, validatedData.guest.check_in_date, validatedData.guest.check_out_date);
      
      if (guestState === 'IN_STAY') {
        // Show toast and redirect to guest portal
        toast({
          title: `Welcome to ${validatedData.resort.name}!`,
          description: 'Your Guest Portal is ready.',
        });
        
        // Small delay for animation
        setTimeout(() => {
          // Store guest info for portal login
          localStorage.setItem('prearrival_guest_redirect', JSON.stringify({
            resortCode: validatedData.resort.code,
            guestId: validatedData.guest.id,
          }));
          navigate(`/r/${validatedData.resort.code}`);
        }, 800);
        return;
      }
      
      if (guestState === 'POST_STAY') {
        // Show stay ended message
        setError('Your stay has ended. Thank you for visiting! We hope to see you again soon.');
        return;
      }

      // Set data directly - no verification animation needed
      setData(validatedData);
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setValidating(false);
    }
  }, [navigate, toast]);

  // Navigate to wizard
  const handleStartCheckin = () => {
    navigate(`/prearrival/${token}/checkin`);
  };

  const handleExploreExperiences = () => {
    navigate(`/prearrival/${token}/experiences`);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          {resortBranding?.logo_url && (
            <img 
              src={resortBranding.logo_url} 
              alt={resortBranding.name} 
              className="h-12 w-auto mx-auto mb-6"
            />
          )}
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Preparing your experience...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="border-destructive/20">
            <CardContent className="py-12 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Unable to Continue</h2>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
              <Button onClick={() => navigate('/')} variant="outline">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }


  // Main landing page
  if (!data) return null;

  const { guest, resort, settings, profile, link } = data;
  const firstName = guest.full_name.split(' ')[0];
  const daysUntilArrival = differenceInDays(parseISO(guest.check_in_date), new Date());
  const guestState = getGuestState(data, guest.check_in_date, guest.check_out_date);
  const isCompleted = guestState === 'PRE_ARRIVAL_COMPLETED';

  const checklistItems = [
    { 
      id: 'arrival', 
      label: 'Arrival details', 
      sublabel: 'Flight, time & transfers',
      icon: Plane, 
      done: profile?.prearrival_status !== 'not_started' 
    },
    { 
      id: 'preferences', 
      label: 'Guest preferences', 
      sublabel: 'Dietary & special needs',
      icon: Utensils, 
      done: profile?.prearrival_status === 'completed' 
    },
    { 
      id: 'checkin', 
      label: 'Online check-in', 
      sublabel: 'Policies & confirmation',
      icon: CheckCircle2, 
      done: !!isCompleted 
    },
  ];

  if (settings.allow_activity_bookings || settings.allow_dining_bookings) {
    checklistItems.push({ 
      id: 'plan', 
      label: 'Plan your stay', 
      sublabel: 'Activities & dining',
      icon: Calendar, 
      done: false 
    });
  }

  const completedCount = checklistItems.filter(i => i.done).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container max-w-4xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {resort.login_logo_url && (
              <img src={resort.login_logo_url} alt={resort.name} className="h-7 w-auto" />
            )}
            <span className="font-semibold text-sm">{resort.name}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container max-w-4xl px-4 py-6 md:py-10 space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Welcome Card */}
          <motion.div variants={itemVariants} className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              {settings.welcome_message || 'Your stay is almost here. Complete a few quick steps to prepare for your arrival.'}
            </p>
          </motion.div>

          {/* Countdown Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Arriving in</p>
                    <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                      <span className="text-4xl md:text-5xl font-bold text-primary">
                        {Math.max(0, daysUntilArrival)}
                      </span>
                      <span className="text-lg text-muted-foreground">
                        {daysUntilArrival === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(parseISO(guest.check_in_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-center sm:text-right space-y-1.5">
                    <Badge variant="outline" className="text-xs font-medium">
                      <MapPin className="h-3 w-3 mr-1" />
                      Room {guest.room_number}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(guest.check_in_date), 'MMM d')} – {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completed State */}
          {isCompleted && (
            <motion.div variants={itemVariants}>
              <Card className="border-success/30 bg-gradient-to-br from-success/10 via-success/5 to-transparent">
                <CardContent className="p-5 flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                    className="h-14 w-14 rounded-2xl bg-success/15 flex items-center justify-center shrink-0"
                  >
                    <PartyPopper className="h-7 w-7 text-success" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-success text-lg">You're all set!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your online check-in is complete. On arrival, this becomes your Guest Portal automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Checklist Preview */}
          {!isCompleted && (
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Complete your pre-arrival
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {progressPercent}% complete
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="space-y-2">
                    {checklistItems.map((item, index) => {
                      const isNext = !item.done && index === checklistItems.findIndex(i => !i.done);
                      return (
                        <motion.div 
                          key={item.id}
                          initial={prefersReducedMotion ? {} : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-colors",
                            item.done ? "bg-success/5" : isNext ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-colors",
                            item.done 
                              ? "bg-success/15 text-success" 
                              : isNext 
                                ? "bg-primary/15 text-primary" 
                                : "bg-muted text-muted-foreground"
                          )}>
                            {item.done ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <item.icon className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "font-medium text-sm block",
                              item.done && "text-muted-foreground"
                            )}>
                              {item.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.sublabel}
                            </span>
                          </div>
                          {isNext && (
                            <Badge className="text-xs shrink-0">Next</Badge>
                          )}
                          {item.done && (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
            <Button 
              size="lg" 
              className="flex-1 h-13 text-base font-semibold shadow-sm"
              onClick={handleStartCheckin}
            >
              {isCompleted ? 'View Your Details' : 'Start Online Check-in'}
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
            
            {(settings.allow_activity_bookings || settings.allow_dining_bookings) && (
              <Button 
                size="lg" 
                variant="outline" 
                className="flex-1 h-13 text-base"
                onClick={handleExploreExperiences}
              >
                <Calendar className="h-5 w-5 mr-2" />
                {isCompleted ? 'Plan Experiences' : 'Explore Experiences'}
              </Button>
            )}
          </motion.div>

          {/* Trust signals */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Secure link
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Takes 2–3 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Save & finish later
            </span>
          </motion.div>

          {/* What happens next */}
          {!isCompleted && (
            <motion.div 
              variants={itemVariants}
              className="text-center pt-4 border-t border-dashed"
            >
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">What happens next?</span>{' '}
                On arrival, this automatically becomes your Guest Portal — no extra login needed.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
