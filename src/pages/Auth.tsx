import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { SEOHead } from '@/components/seo/SEOHead';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your username or email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Please enter your name'),
  username: z.string()
    .min(3, 'Usernames must be at least 3 characters long')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Usernames can only contain letters, numbers, and dots or underscores'),
  email: z.string().email('Please enter a valid email address, or leave this field empty').optional().or(z.literal('')),
  password: z.string().min(8, 'Your password is too short. Please choose a stronger one'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please check and try again",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in (but wait for auth to finish loading)
  if (!authLoading && user) {
    navigate('/staff/dashboard', { replace: true });
    return null;
  }

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
      // First, lookup the user by username or email to get their actual email
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

      // Use the found email to sign in
      const actualEmail = userData[0].email;
      const { error } = await signIn(actualEmail, loginPassword);

      if (error) {
        throw new Error('Invalid username/email or password');
      }
      
      navigate('/staff/dashboard', { replace: true });
    } catch (error: any) {
      // Clear password field for security but keep identifier
      setLoginPassword('');
      setErrors({
        login_form: error.message || 'Invalid username/email or password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = signupSchema.safeParse({
      fullName: signupName,
      username: signupUsername,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[`signup_${err.path[0]}`] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Use the create_staff_account function to create a new user with username
      const { data, error } = await supabase.rpc('create_staff_account', {
        p_username: signupUsername.trim(),
        p_password: signupPassword,
        p_full_name: signupName.trim() || null,
        p_email: signupEmail.trim() || null,
        p_resort_id: null,
        p_resort_role: null,
        p_department: null,
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; email?: string };
      if (!response.success) {
        if (response.error?.includes('already taken')) {
          toast({
            variant: 'destructive',
            title: 'Username taken',
            description: 'This username is already in use. Please choose another.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Signup failed',
            description: response.error || 'Failed to create account',
          });
        }
        return;
      }

      // Sign in with the newly created account
      const actualEmail = response.email;
      if (actualEmail) {
        await signIn(actualEmail, signupPassword);
      }

      toast({
        title: 'Account created',
        description: 'Welcome to Propera! You can now sign in with your username.',
      });
      navigate('/staff/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: error.message || 'Failed to create account',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SEOHead
        title="Staff Login"
        description="Sign in to the Propera staff console to manage resort operations, guests, activities, and reservations."
        noIndex={true}
      />
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>

      {/* Brand Panel - Left side on desktop, top on mobile */}
      <div className="relative lg:w-2/5 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 lg:p-12 flex flex-col justify-center">
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

          {/* Decorative element */}
          <div className="hidden lg:block">
            <div className="h-1 w-16 bg-primary/20 rounded-full" />
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Form Panel - Right side on desktop, bottom on mobile */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          <Card className="shadow-lg border-border/50">
            <Tabs defaultValue="login">
              <CardHeader className="pb-3">
                  <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="login" className="text-sm font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">Create Account</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-5 pt-6">
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
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
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
                      Staff accounts only. Contact your administrator for access.
                    </p>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-5 pt-6">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">
                        Full name
                      </Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="e.g. Ali Ahmed"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        This name will be shown to your colleagues in reports and assignments
                      </p>
                      {errors.signup_fullName && (
                        <p className="text-sm text-destructive">{errors.signup_fullName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-username" className="text-sm font-medium">
                        Username
                      </Label>
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="e.g. ali.frontoffice"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        You'll use this to log in. It must be unique and contain no spaces
                      </p>
                      {errors.signup_username && (
                        <p className="text-sm text-destructive">{errors.signup_username}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email (optional)
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Add your email if you'd like to receive updates or use email to log in later
                      </p>
                      {errors.signup_email && (
                        <p className="text-sm text-destructive">{errors.signup_email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          disabled={isLoading}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">At least 8 characters. Use something you don't use anywhere else</p>
                      {errors.signup_password && (
                        <p className="text-sm text-destructive">{errors.signup_password}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-medium">
                        Confirm password
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm"
                          type={showSignupConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          disabled={isLoading}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showSignupConfirm ? "Hide password" : "Show password"}
                        >
                          {showSignupConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">Type the same password again to confirm</p>
                      {errors.signup_confirmPassword && (
                        <p className="text-sm text-destructive">{errors.signup_confirmPassword}</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-4 pt-2">
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating your account…
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      By creating an account, you agree to follow your resort's policies
                    </p>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}