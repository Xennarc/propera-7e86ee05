import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, AlertCircle, Lock, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { SEOHead } from '@/components/seo/SEOHead';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState(searchParams.get('username') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Password reset state
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user needs password reset after login
  useEffect(() => {
    const checkPasswordReset = async () => {
      if (user && !mustResetPassword) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_reset_password, temp_password_expires_at')
          .eq('id', user.id)
          .single();

        if (profile?.must_reset_password) {
          // Check if temp password expired
          if (profile.temp_password_expires_at && new Date(profile.temp_password_expires_at) < new Date()) {
            toast({
              title: 'Password Expired',
              description: 'Your temporary password has expired. Please contact your administrator.',
              variant: 'destructive',
            });
            await supabase.auth.signOut();
            return;
          }
          setMustResetPassword(true);
        } else {
          navigate('/staff/dashboard', { replace: true });
        }
      }
    };

    if (!authLoading && user) {
      checkPasswordReset();
    }
  }, [user, authLoading, mustResetPassword, navigate, toast]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ identifier: loginIdentifier, password: loginPassword });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[`login_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { data: lookupData, error: lookupError } = await supabase
        .rpc('staff_lookup_by_identifier', { p_identifier: loginIdentifier });

      if (lookupError) {
        console.error('Lookup error:', lookupError);
        throw new Error('Invalid username/email or password');
      }

      const userData = lookupData as { user_id: string; email: string; username: string; full_name: string }[] | null;
      
      if (!userData || userData.length === 0) {
        throw new Error('Invalid username/email or password');
      }

      const actualEmail = userData[0].email;
      const { error } = await signIn(actualEmail, loginPassword);

      if (error) {
        throw new Error('Invalid username/email or password');
      }
      
      // Navigation handled by useEffect after checking password reset
    } catch (error: any) {
      setLoginPassword('');
      setErrors({
        login_form: error.message || 'Invalid username/email or password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = passwordResetSchema.safeParse({ newPassword, confirmPassword });
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

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-password-reset', {
        body: { new_password: newPassword },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Failed to update password');
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been set successfully. Welcome to Propera!',
      });

      setMustResetPassword(false);
      navigate('/staff/dashboard', { replace: true });
    } catch (error: any) {
      setErrors({
        reset_form: error.message || 'Failed to update password. Please try again.',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  // Password reset screen
  if (mustResetPassword && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <SEOHead title="Set Your Password" noIndex={true} />
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Set Your New Password</CardTitle>
            <CardDescription>
              Please create a secure password for your account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handlePasswordReset}>
            <CardContent className="space-y-5">
              {errors.reset_form && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.reset_form}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={resettingPassword}>
                {resettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Set Password & Continue
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SEOHead
        title="Staff Login"
        description="Sign in to the Propera staff console to manage resort operations, guests, activities, and reservations."
        noIndex={true}
      />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>

      <div className="relative lg:w-2/5 bg-gradient-to-br from-lime-400/10 via-midnight-900/50 to-background dark:from-lime-400/5 dark:via-midnight-950 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <ProperaMark size={48} className="text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Propera</h1>
              <p className="text-sm text-muted-foreground">Staff Console</p>
            </div>
          </div>
          
          <div className="space-y-3 hidden lg:block">
            <h2 className="text-xl font-semibold text-foreground">
              Manage your resort operations
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Sign in to manage guests, activities, and reservations for your resort. 
              Everything you need in one place.
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="h-1 w-16 bg-primary/20 rounded-full" />
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <Card className="shadow-2xl shadow-black/10 border-border/30 dark:border-midnight-700/50 dark:bg-midnight-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to access the staff console
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5">
                {errors.login_form && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.login_form}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="login-identifier" className="text-sm font-medium">
                    Username or Email
                  </Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder="Enter your username or email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.login_identifier && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.login_identifier}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.login_password && (
                    <p className="text-sm text-destructive">{errors.login_password}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4 pt-2">
                <Button type="submit" className="w-full h-11 font-medium rounded-xl glow-lime" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Staff accounts are created by your resort administrator. Contact them if you need access.
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
