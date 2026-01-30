import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ResortRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Building2, UserPlus, CheckCircle, XCircle, LogOut, Waves, Eye, EyeOff, Loader2, AtSign, Shield, MessageSquare, Calendar } from 'lucide-react';
import { z } from 'zod';

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  status: string;
  expires_at: string;
  resort_name: string;
  invited_by_name: string | null;
  invite_message: string | null;
}

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  RESERVATIONS: 'Reservations',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
  TRANSPORT: 'Transport',
};

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  if (score < 40) return { score, label: 'Weak', color: 'bg-destructive' };
  if (score < 70) return { score, label: 'Fair', color: 'bg-warning' };
  if (score < 90) return { score, label: 'Good', color: 'bg-success/70' };
  return { score, label: 'Strong', color: 'bg-success' };
}

export default function StaffInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, signOut, refetchUserData } = useAuth();
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const passwordStrength = getPasswordStrength(formData.password);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      // Use secure RPC function to fetch invitation by token
      const { data, error: fetchError } = await supabase
        .rpc('get_staff_invitation_by_token', { p_token: token });

      if (fetchError) {
        console.error('Error fetching invitation:', fetchError);
        setError('This invitation link is no longer valid');
        setLoading(false);
        return;
      }

      // RPC returns an array, get first result
      const invData = Array.isArray(data) ? data[0] : data;
      
      if (!invData) {
        setError('This invitation link is no longer valid');
        setLoading(false);
        return;
      }

      const inv: Invitation = {
        id: invData.id,
        email: invData.email,
        name: invData.name,
        username: invData.username,
        resort_id: invData.resort_id,
        resort_role: invData.resort_role as ResortRole,
        department: invData.department,
        status: invData.status,
        expires_at: invData.expires_at,
        resort_name: invData.resort_name,
        invited_by_name: invData.invited_by_name,
        invite_message: invData.invite_message,
      };

      if (inv.status === 'ACCEPTED') {
        setError('ALREADY_ACCEPTED');
        setLoading(false);
        return;
      }
      
      if (inv.status !== 'PENDING') {
        setError('This invitation has already been used or cancelled.');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired.');
        setLoading(false);
        return;
      }

      setInvitation(inv);
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordAndAccept = async () => {
    if (!invitation) return;

    setErrors({});
    const result = passwordSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setAccepting(true);
    try {
      // Create the staff user account
      const { data, error } = await supabase.rpc('create_staff_account', {
        p_username: invitation.username || invitation.email.split('@')[0],
        p_password: formData.password,
        p_full_name: invitation.name || null,
        p_email: invitation.email,
        p_global_role: 'STANDARD',
        p_resort_id: invitation.resort_id,
        p_resort_role: invitation.resort_role,
        p_department: invitation.department,
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; user_id?: string; email?: string };
      if (!response.success) {
        if (response.error?.includes('already taken')) {
          toast.error('That username is no longer available. Please contact your administrator.');
          return;
        }
        throw new Error(response.error || 'Failed to create account');
      }

      // Sign in the new user (required before joining the resort staff area)
      const signInEmail = response.email || invitation.email;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: formData.password,
      });

      if (signInError) {
        console.error('Sign-in error after account creation:', signInError);
        toast.success('Account created! Please sign in with your credentials.');
        navigate('/staff/auth');
        return;
      }

      // Accept the invitation (marks invite accepted + ensures resort membership exists)
      const { error: acceptError } = await supabase.rpc('accept_staff_invitation', {
        p_token: token as string,
        p_user_id: response.user_id as string,
      });

      if (acceptError) {
        console.error('Error accepting invitation after login:', acceptError);
        toast.error('Signed in, but failed to activate your resort access. Please contact your administrator.');
        navigate('/staff/dashboard');
        return;
      }

      // Ensure the app selects the invited resort after login
      localStorage.setItem('propera-current-resort-id', invitation.resort_id);
      await refetchUserData();

      toast.success('Welcome to the team! Your account is ready.');
      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      // Provide a helpful, actionable error message instead of a generic failure.
      const raw = err as any;
      const msg =
        typeof raw?.message === 'string'
          ? raw.message
          : typeof raw?.error?.message === 'string'
            ? raw.error.message
            : typeof raw?.details === 'string'
              ? raw.details
              : 'Failed to create account. Please try again.';

      console.error('Error accepting invitation:', err);

      // Common case: account already exists (e.g. user clicked twice or invite resent)
      const looksLikeDuplicate =
        typeof msg === 'string' &&
        (msg.toLowerCase().includes('duplicate') ||
          msg.toLowerCase().includes('already exists') ||
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('unique constraint') ||
          msg.toLowerCase().includes('23505'));

      if (looksLikeDuplicate) {
        // Try to sign in anyway, then activate resort access.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: formData.password,
        });

        if (!signInError) {
          const { data: userData } = await supabase.auth.getUser();
          const signedInUserId = userData.user?.id;

          const { error: acceptError } = await supabase.rpc('accept_staff_invitation', {
            p_token: token as string,
            p_user_id: signedInUserId as string,
          });

          if (!acceptError) {
            localStorage.setItem('propera-current-resort-id', invitation.resort_id);
            await refetchUserData();
            toast.success('Welcome to the team! Your account is ready.');
            navigate('/staff/dashboard', { replace: true });
            return;
          }
        }

        toast.error('An account already exists for this email. Please sign in instead.');
        navigate('/staff/auth');
        return;
      }

      toast.error(msg);
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptAsCurrentUser = async () => {
    if (!invitation || !user) return;

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error('Your email does not match the invitation. Please sign out and create a new account.');
      return;
    }

    setAccepting(true);
    try {
      // Check if membership already exists
      const { data: existing } = await supabase
        .from('resort_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('resort_id', invitation.resort_id)
        .single();

      if (existing) {
        toast.info('You already have access to this resort.');
        navigate('/staff');
        return;
      }

      // Accept invitation using secure function
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_staff_invitation', {
          p_token: token,
          p_user_id: user.id,
        });

      if (acceptError) throw acceptError;
      
      const result = acceptResult as { success: boolean; message?: string } | null;
      if (result && !result.success) {
        throw new Error(result.message || 'Failed to accept invitation');
      }

      await refetchUserData();
      toast.success('Welcome to the team!');
      navigate('/staff');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    // Special handling for already-accepted invites
    if (error === 'ALREADY_ACCEPTED') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Invitation Already Accepted</h2>
              <p className="text-muted-foreground">
                This invitation has already been accepted and your account is active. You can sign in with your credentials.
              </p>
            </div>
            <Button onClick={() => navigate('/auth')} size="lg" className="mt-6">
              Go to Sign In
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">This invitation link is no longer valid</h2>
            <p className="text-muted-foreground">
              The link may have expired, been revoked, or already used. Please contact your resort administrator to request a new invitation.
            </p>
          </div>
          <Button onClick={() => navigate('/auth')} size="lg" className="mt-6">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const emailMatch = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand Panel */}
      <div className="relative lg:w-2/5 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 lg:p-12 flex flex-col justify-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3" />
        
        <div className="relative max-w-md mx-auto w-full space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
              <Waves className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Propera</h1>
              <p className="text-sm text-white/70">Staff Console</p>
            </div>
          </div>
          
          {/* Welcome message */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              You've been invited
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
              Welcome to<br/>{invitation.resort_name}
            </h2>
            {invitation.invited_by_name && (
              <p className="text-white/80 text-lg">
                <span className="font-medium">{invitation.invited_by_name}</span> invited you to join the team
              </p>
            )}
          </div>

          {/* Details card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white/70 text-sm">Your role</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className="bg-white/20 text-white border-0 hover:bg-white/30">
                    {ROLE_LABELS[invitation.resort_role]}
                  </Badge>
                  {invitation.department && (
                    <span className="text-sm text-white/60">• {invitation.department}</span>
                  )}
                </div>
              </div>
            </div>
            
            {invitation.username && (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <AtSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-white/70 text-sm">Your username</span>
                  <p className="font-mono text-white font-medium">@{invitation.username}</p>
                </div>
              </div>
            )}
          </div>

          {/* Personal note */}
          {invitation.invite_message && (
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-white/70 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/70 text-sm mb-1">Message from {invitation.invited_by_name}</p>
                  <p className="text-white italic">"{invitation.invite_message}"</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-xl border-border/50">
            <CardHeader className="space-y-2 text-center pb-2">
              <CardTitle className="text-2xl">Set your password</CardTitle>
              <CardDescription>
                Choose a secure password to complete your account setup
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {user ? (
                // User is logged in
                <div className="space-y-4">
                  {emailMatch ? (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-xl">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Signed in as {user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Click below to join {invitation.resort_name}
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="w-full h-12" 
                        size="lg"
                        onClick={handleAcceptAsCurrentUser}
                        disabled={accepting}
                      >
                        {accepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          'Accept & Join Team'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
                        <XCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Email Mismatch</p>
                          <p className="text-xs text-muted-foreground">
                            You're signed in as {user.email}, but this invitation is for {invitation.email}.
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full h-12"
                        size="lg"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                // User is not logged in - show password setup form
                <div className="space-y-5">
                  {/* Email display */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <div className="flex items-center h-11 px-3 rounded-lg bg-muted border border-border">
                      <span className="text-sm text-foreground">{invitation.email}</span>
                    </div>
                  </div>

                  {/* Username display */}
                  {invitation.username && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                      <div className="flex items-center h-11 px-3 rounded-lg bg-muted border border-border">
                        <AtSign className="h-4 w-4 text-muted-foreground mr-1" />
                        <span className="text-sm font-mono text-foreground">{invitation.username}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">This username was assigned by your administrator</p>
                    </div>
                  )}

                  {/* Password field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Create Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Choose a secure password"
                        className="h-12 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {/* Password strength */}
                    {formData.password && (
                      <div className="space-y-1.5">
                        <Progress value={passwordStrength.score} className="h-1.5" />
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${
                            passwordStrength.score < 40 ? 'text-destructive' :
                            passwordStrength.score < 70 ? 'text-warning' : 'text-success'
                          }`}>
                            {passwordStrength.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formData.password.length} characters
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      Use at least 8 characters with a mix of letters, numbers, and symbols
                    </p>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Type your password again"
                        className="h-12 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <div className="flex items-center gap-1.5 text-success text-xs">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Passwords match
                      </div>
                    )}
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  {/* Submit button */}
                  <Button 
                    className="w-full h-12 font-medium text-base" 
                    size="lg"
                    onClick={handleSetPasswordAndAccept}
                    disabled={accepting || !formData.password || !formData.confirmPassword}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating your account...
                      </>
                    ) : (
                      'Set Password & Activate Account'
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground pt-2">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/auth')}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expiry notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              This invitation expires on {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
