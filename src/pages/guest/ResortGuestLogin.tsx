import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Waves, Loader2, Lock, User, AlertCircle, Home } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface ResortBranding {
  id: string;
  name: string;
  code: string;
  login_logo_url: string | null;
  login_hero_image_url: string | null;
  login_primary_color: string | null;
  login_accent_color: string | null;
  guest_login_title: string | null;
  guest_login_subtitle: string | null;
  guest_login_instructions: string | null;
}

export default function ResortGuestLogin() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { guest, login, logout } = useGuestAuth();
  const [loading, setLoading] = useState(false);
  const [loadingResort, setLoadingResort] = useState(true);
  const [resort, setResort] = useState<ResortBranding | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ roomNumber: '', lastName: '', pin: '' });

  // Handle if already logged in - check for resort mismatch
  useEffect(() => {
    if (guest && resort) {
      // If logged into a different resort, show mismatch handling
      if (guest.resortId !== resort.id) {
        // Don't redirect, let them see the mismatch message
        return;
      }
      // Same resort - redirect to portal
      navigate('/guest');
    } else if (guest && !loadingResort && !resort) {
      // Still loading resort or resort not found
      navigate('/guest');
    }
  }, [guest, resort, loadingResort, navigate]);

  // Fetch resort by code
  useEffect(() => {
    if (!code) {
      setNotFound(true);
      setLoadingResort(false);
      return;
    }

    const fetchResort = async () => {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, code, login_logo_url, login_hero_image_url, login_primary_color, login_accent_color, guest_login_title, guest_login_subtitle, guest_login_instructions')
        .ilike('code', code)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setResort(data as ResortBranding);
      }
      setLoadingResort(false);
    };

    fetchResort();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resort) return;
    
    setError('');
    setLoading(true);
    const result = await login(resort.id, formData.roomNumber, formData.lastName, formData.pin);
    if (result.error) setError(result.error);
    else navigate('/guest');
    setLoading(false);
  };

  // Loading state
  if (loadingResort) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Resort not found
  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Resort Not Found</h1>
            <p className="text-muted-foreground text-center mb-6">
              The resort code "{code}" was not found. Please check the URL or contact your resort.
            </p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session mismatch - guest is logged into a different resort
  if (guest && resort && guest.resortId !== resort.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Different Resort</h1>
            <p className="text-muted-foreground text-center mb-6">
              You are currently logged into a different resort. Please log out first to access {resort.name}.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={logout} variant="default" className="w-full">
                Log Out & Continue Here
              </Button>
              <Link to="/guest" className="w-full">
                <Button variant="outline" className="w-full">
                  Return to Current Portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Apply custom colors via CSS variables if provided
  const customStyles: React.CSSProperties = {};
  if (resort?.login_primary_color) {
    customStyles['--resort-primary' as string] = resort.login_primary_color;
  }
  if (resort?.login_accent_color) {
    customStyles['--resort-accent' as string] = resort.login_accent_color;
  }

  const title = resort?.guest_login_title || `Welcome to ${resort?.name}`;
  const subtitle = resort?.guest_login_subtitle || 'Access your resort experience';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={customStyles}
    >
      {/* Background - either hero image or gradient */}
      {resort?.login_hero_image_url ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${resort.login_hero_image_url})` }}
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
          </div>
        </>
      )}

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className={resort?.login_hero_image_url ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header with logo or icon */}
        <div className="text-center mb-8">
          {resort?.login_logo_url ? (
            <div className="mb-4">
              <img 
                src={resort.login_logo_url} 
                alt={resort.name} 
                className="h-16 mx-auto object-contain"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 backdrop-blur-sm mb-4">
              <Waves className="h-8 w-8 text-primary" />
            </div>
          )}
          <h1 className={`text-2xl font-bold ${resort?.login_hero_image_url ? 'text-white' : 'text-foreground'}`}>
            {title}
          </h1>
          <p className={`mt-1 ${resort?.login_hero_image_url ? 'text-white/80' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Use your room number and last name to view your schedule and make bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Room Number</Label>
                  <Input 
                    placeholder="e.g., 101" 
                    value={formData.roomNumber} 
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} 
                    className="font-mono" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Last Name
                  </Label>
                  <Input 
                    placeholder="Smith" 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  PIN Code
                </Label>
                <Input 
                  type="password" 
                  inputMode="numeric" 
                  maxLength={6} 
                  placeholder="Enter PIN" 
                  value={formData.pin} 
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })} 
                  className="text-center tracking-widest font-mono" 
                />
              </div>
              
              {/* Custom instructions */}
              {resort?.guest_login_instructions && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {resort.guest_login_instructions}
                </p>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold"
                style={resort?.login_primary_color ? { 
                  backgroundColor: resort.login_primary_color,
                  borderColor: resort.login_primary_color 
                } : undefined}
                disabled={loading || !formData.roomNumber || !formData.lastName || !formData.pin}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className={`text-center text-xs mt-6 ${resort?.login_hero_image_url ? 'text-white/60' : 'text-muted-foreground'}`}>
          Need help? Please contact your front desk
        </p>
      </div>
    </div>
  );
}
