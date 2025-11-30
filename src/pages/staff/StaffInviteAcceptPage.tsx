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
import { Building2, UserPlus, CheckCircle, XCircle, LogOut } from 'lucide-react';
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
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
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
  const [formData, setFormData] = useState({
    fullName: '',
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
      const { data, error: fetchError } = await supabase
        .from('staff_invitations')
        .select(`
          *,
          resort:resorts(id, name, code)
        `)
        .eq('token', token)
        .single();

      if (fetchError || !data) {
        setError('Invitation not found. Please contact your resort admin for a new link.');
        setLoading(false);
        return;
      }

      const inv = data as unknown as Invitation;

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
      // Sign up new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/staff`,
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
          return;
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Failed to create user');
      }

      // Create resort membership
      const { error: membershipError } = await supabase
        .from('resort_memberships')
        .insert({
          user_id: signUpData.user.id,
          resort_id: invitation.resort_id,
          resort_role: invitation.resort_role,
          department: invitation.department,
        });

      if (membershipError) {
        console.error('Membership error:', membershipError);
        // Continue anyway - user is created
      }

      // Update invitation status
      await supabase
        .from('staff_invitations')
        .update({ status: 'ACCEPTED' })
        .eq('id', invitation.id);

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

      // Create resort membership
      const { error: membershipError } = await supabase
        .from('resort_memberships')
        .insert({
          user_id: user.id,
          resort_id: invitation.resort_id,
          resort_role: invitation.resort_role,
          department: invitation.department,
        });

      if (membershipError) throw membershipError;

      // Update invitation status
      await supabase
        .from('staff_invitations')
        .update({ status: 'ACCEPTED' })
        .eq('id', invitation.id);

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
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const emailMatch = user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join Propera Staff</CardTitle>
          <CardDescription>
            You've been invited to join {invitation.resort.name}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{invitation.resort.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role:</span>
              <Badge variant="secondary">{ROLE_LABELS[invitation.resort_role]}</Badge>
            </div>
            {invitation.department && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Department:</span>
                <span className="text-sm">{invitation.department}</span>
              </div>
            )}
          </div>

          {user ? (
            // User is logged in
            <div className="space-y-4">
              {emailMatch ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-medium">Signed in as {user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        This matches the invitation email
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleAcceptAsCurrentUser}
                    disabled={accepting}
                  >
                    {accepting ? 'Accepting...' : 'Accept Invitation'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <XCircle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="text-sm font-medium">Email Mismatch</p>
                      <p className="text-xs text-muted-foreground">
                        You're signed in as {user.email}, but this invitation is for {invitation.email}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="John Smith"
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Min 6 characters"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repeat password"
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button 
                className="w-full" 
                onClick={handleSignUpAndAccept}
                disabled={accepting}
              >
                {accepting ? 'Creating Account...' : 'Create Account & Join'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs"
                  onClick={() => navigate('/auth')}
                >
                  Sign in
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}