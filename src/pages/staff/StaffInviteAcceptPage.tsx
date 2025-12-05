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
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { Building2, UserPlus, CheckCircle, XCircle, LogOut, Waves, Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';

interface Invitation {
  id: string;
  email: string;
  name: string | null;
  resort_id: string;
  resort_role: ResortRole;
  department: string | null;
  status: string;
  expires_at: string;
  resort: {
    id: string;
    name: string;
    code: string;
  };
}

const ROLE_LABELS: Record<ResortRole, string> = {
  RESORT_ADMIN: 'Resort Admin',
  MANAGER: 'Manager',
  FRONT_OFFICE: 'Front Office',
  ACTIVITIES: 'Activities',
  FNB: 'F&B',
};

const signupSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  username: z.string()
    .min(3, 'Usernames must be at least 3 characters long')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Usernames can only contain letters, numbers, and dots or underscores'),
  password: z.string().min(8, 'Your password is too short. Please choose a stronger one'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please check and try again",
  path: ['confirmPassword'],
});

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
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

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
        setError('Invitation not found. Please contact your resort admin for a new link.');
        setLoading(false);
        return;
      }

      // RPC returns an array, get first result
      const invData = Array.isArray(data) ? data[0] : data;
      
      if (!invData) {
        setError('Invitation not found. Please contact your resort admin for a new link.');
        setLoading(false);
        return;
      }

      // Transform RPC result to match expected Invitation interface
      const inv: Invitation = {
        id: invData.id,
        email: invData.email,
        name: invData.name,
        resort_id: invData.resort_id,
        resort_role: invData.resort_role as ResortRole,
        department: invData.department,
        status: invData.status,
        expires_at: invData.expires_at,
        resort: {
          id: invData.resort_id,
          name: invData.resort_name,
          code: '', // Not needed for display
        },
      };

      if (inv.status !== 'PENDING') {
        setError('This invitation has already been used or cancelled.');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your resort admin for a new link.');
        setLoading(false);
        return;
      }

      setInvitation(inv);
      if (inv.name) {
        setFormData(prev => ({ ...prev, fullName: inv.name || '' }));
      }
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpAndAccept = async () => {
    if (!invitation) return;

    setErrors({});
    const result = signupSchema.safeParse(formData);
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
      // Use the create_staff_account RPC to create user with username
      const { data, error } = await supabase.rpc('create_staff_account', {
        p_username: formData.username.trim(),
        p_password: formData.password,
        p_full_name: formData.fullName.trim() || null,
        p_email: invitation.email,
        p_resort_id: invitation.resort_id,
        p_resort_role: invitation.resort_role,
        p_department: invitation.department,
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; user_id?: string; email?: string };
      if (!response.success) {
        if (response.error?.includes('already taken')) {
          toast.error('This username is already taken. Please choose another.');
          return;
        }
        throw new Error(response.error || 'Failed to create account');
      }

      // Mark invitation as accepted
      await supabase
        .from('staff_invitations')
        .update({ status: 'ACCEPTED' })
        .eq('token', token);

      // Sign in the new user
      if (response.email) {
        await supabase.auth.signInWithPassword({
          email: response.email,
          password: formData.password,
        });
      }

      toast.success('Account created successfully! Welcome to the team.');
      navigate('/staff');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error('Failed to create account. Please try again.');
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

      // Accept invitation using secure function (handles membership + status update)
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
      toast.success('Invitation accepted! Welcome to the team.');
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">This invitation has expired</h2>
            <p className="text-muted-foreground">
              This invite link is no longer valid. Please contact your resort admin to request a new invitation.
            </p>
          </div>
          <Button onClick={() => navigate('/auth')} className="mt-6">
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const emailMatch = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand Panel - Left side on desktop, top on mobile */}
      <div className="relative lg:w-2/5 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Propera</h1>
              <p className="text-sm text-muted-foreground">Staff Console</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              You're joining
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              {invitation.resort.name}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You've been invited to join {invitation.resort.name} on Propera. 
              This account lets you manage guests, activities and reservations.
            </p>
          </div>

          {/* Resort context */}
          <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Your role</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {ROLE_LABELS[invitation.resort_role]}
              </Badge>
              {invitation.department && (
                <span className="text-sm text-muted-foreground">• {invitation.department}</span>
              )}
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Form Panel - Right side on desktop */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <Card className="shadow-lg border-border/50">
            <CardHeader className="space-y-2 text-center lg:text-left">
              <CardTitle className="text-2xl">Create your staff account</CardTitle>
              <CardDescription>
                Set up your credentials to access the staff console
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {user ? (
                // User is logged in
                <div className="space-y-4">
                  {emailMatch ? (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Signed in as {user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            This matches the invitation email. Click below to complete setup.
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="w-full h-11" 
                        onClick={handleAcceptAsCurrentUser}
                        disabled={accepting}
                      >
                        {accepting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          'Accept Invitation & Continue'
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <XCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Email Mismatch</p>
                          <p className="text-xs text-muted-foreground">
                            You're signed in as {user.email}, but this invitation is for {invitation.email}. 
                            Please sign out to create a new account.
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full h-11"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out & Create New Account
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                // User is not logged in - show signup form
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation.email}
                      disabled
                      className="bg-muted h-11"
                    />
                    <p className="text-xs text-muted-foreground">Your invitation email (cannot be changed)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g. Ali Ahmed"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      This name will be shown to your colleagues in reports and assignments
                    </p>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g. ali.frontoffice"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll use this to log in. It must be unique and contain no spaces
                    </p>
                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                        className="h-11 pr-10"
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
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters. Use something you don't use anywhere else
                    </p>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="h-11 pr-10"
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
                    <p className="text-xs text-muted-foreground">
                      Type the same password again to confirm
                    </p>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  <Button 
                    className="w-full h-11 font-medium" 
                    onClick={handleSignUpAndAccept}
                    disabled={accepting}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating your account…
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/auth')}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">
                        Already have an account?
                      </span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full h-11"
                    onClick={() => navigate('/auth')}
                  >
                    Sign in instead
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}