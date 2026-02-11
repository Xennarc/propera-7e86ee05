import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { GUEST_ROUTES, isGuestPath } from '@/routes/guestRoutes';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useResortBranding, getBrandingWithDefaults } from '@/hooks/useResortBranding';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, User, AlertCircle, Home, Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { SEOHead, createResortSchema } from '@/components/seo/SEOHead';

type ResortStatus = 'ACTIVE' | 'INACTIVE' | 'DEMO';

interface ResortBasicInfo {
  id: string;
  name: string;
  code: string;
  status: ResortStatus;
}

interface VerifyQrResponse {
  valid: boolean;
  error?: string;
  message?: string;
  resortCode?: string;
  roomNumber?: string;
  lastName?: string;
  pin?: string;
}

export default function ResortGuestLogin() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guest, login, logout } = useGuestAuth();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [loadingResort, setLoadingResort] = useState(true);
  const [resortInfo, setResortInfo] = useState<ResortBasicInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [resortInactive, setResortInactive] = useState(false);
  const [error, setError] = useState('');
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const autoLoginRef = useRef(false);
  
  // Fetch branding dynamically via hook - ensures fresh data after staff saves
  const { data: brandingData, isLoading: brandingLoading } = useResortBranding(code);
  const branding = getBrandingWithDefaults(brandingData);
  
  // Initialize form with URL params from "Find Resort" flow or QR auto-login
  const [formData, setFormData] = useState(() => ({
    roomNumber: searchParams.get('roomNumber') || searchParams.get('room') || '',
    lastName: searchParams.get('lastName') || searchParams.get('last') || '',
    pin: '', // Don't pre-fill PIN in initial state for security
  }));

  // Auto-login attempt handler
  const attemptAutoLogin = useCallback(async (
    room: string, 
    last: string, 
    pin: string, 
    exp: string, 
    sig: string,
    resortId: string
  ) => {
    setLoading(true);
    setError('');

    try {
      // 1. Call verify-qr-login edge function to validate signature
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke<VerifyQrResponse>(
        'verify-qr-login',
        {
          body: { resortCode: code, room, last, pin, exp, sig },
        }
      );

      if (verifyError) {
        console.error('Verify QR error:', verifyError);
        setError('Unable to verify QR code. Please enter your credentials manually.');
        setLoading(false);
        return;
      }

      if (!verifyData?.valid) {
        // Show user-friendly error based on error type
        if (verifyData?.error === 'EXPIRED') {
          setError('This QR code has expired. Please enter your PIN manually or ask staff for a new QR code.');
        } else if (verifyData?.error === 'INVALID_SIGNATURE') {
          setError('This QR code is invalid. Please ask staff for a new one.');
          // Clear pre-filled fields for invalid signature
          setFormData(prev => ({ ...prev, pin: '' }));
        } else {
          setError(verifyData?.message || 'QR code verification failed. Please enter your credentials manually.');
        }
        setLoading(false);
        return;
      }

      // 2. Signature valid - proceed with PIN login
      const result = await login(resortId, room, last, pin);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        navigate('/guest');
      }
    } catch (err) {
      console.error('Auto-login error:', err);
      setError('An error occurred. Please enter your credentials manually.');
      setLoading(false);
    }
  }, [code, login, navigate]);

  // Handle if already logged in - check for resort mismatch
  useEffect(() => {
    if (guest && resortInfo) {
      // If logged into a different resort, show mismatch handling
      if (guest.resortId !== resortInfo.id) {
        return;
      }
      // Same resort - redirect to portal
      navigate('/guest');
    } else if (guest && !loadingResort && !resortInfo) {
      navigate('/guest');
    }
  }, [guest, resortInfo, loadingResort, navigate]);

  // Fetch resort basic info (id, status) - branding comes from the hook
  useEffect(() => {
    if (!code) {
      setNotFound(true);
      setLoadingResort(false);
      return;
    }

    const fetchResort = async (retryCount = 0) => {
      try {
        // Query resort directly - RLS policy restricts to active resorts only
        const { data, error } = await supabase
          .from('resorts')
          .select('id, name, code, status')
          .ilike('code', code)
          .maybeSingle();

        if (error) {
          console.error('Error fetching resort:', error);
          if (retryCount < 2) {
            setTimeout(() => fetchResort(retryCount + 1), 500);
            return;
          }
          setNotFound(true);
          setLoadingResort(false);
          return;
        }

        if (!data) {
          setNotFound(true);
          setLoadingResort(false);
        } else {
          const info: ResortBasicInfo = {
            id: data.id,
            name: data.name,
            code: data.code,
            status: data.status as ResortStatus,
          };
          if (info.status === 'INACTIVE') {
            setResortInactive(true);
          }
          setResortInfo(info);
          setLoadingResort(false);
        }
      } catch (err) {
        console.error('Error fetching resort:', err);
        if (retryCount < 2) {
          setTimeout(() => fetchResort(retryCount + 1), 500);
          return;
        }
        setNotFound(true);
        setLoadingResort(false);
      }
    };

    fetchResort();
  }, [code]);

  // Handle QR auto-login parameters
  useEffect(() => {
    // Only attempt once and after resort is loaded
    if (autoLoginRef.current || loadingResort || !resortInfo) return;

    const room = searchParams.get('room');
    const last = searchParams.get('last');
    const pin = searchParams.get('pin');
    const exp = searchParams.get('exp');
    const sig = searchParams.get('sig');
    const autologin = searchParams.get('autologin');

    // Pre-fill fields if params exist (even without autologin)
    if (room || last) {
      setFormData(prev => ({
        ...prev,
        roomNumber: room || prev.roomNumber,
        lastName: last || prev.lastName,
        // Only pre-fill PIN if all auto-login params are present
        pin: (room && last && pin && exp && sig && autologin) ? pin : prev.pin,
      }));
    }

    // Attempt auto-login if all params present and autologin flag set
    if (room && last && pin && exp && sig && autologin === '1') {
      autoLoginRef.current = true;
      setAutoLoginAttempted(true);
      attemptAutoLogin(room, last, pin, exp, sig, resortInfo.id);
    }
  }, [searchParams, loadingResort, resortInfo, attemptAutoLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resortInfo) return;
    
    setError('');
    setLoading(true);
    const result = await login(resortInfo.id, formData.roomNumber, formData.lastName, formData.pin);
    if (result.error) setError(result.error);
    else navigate('/guest');
    setLoading(false);
  };

  // Loading state
  if (loadingResort || brandingLoading) {
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
        <SEOHead
          title="Resort Not Found"
          description="The resort you're looking for could not be found. Please check the URL or contact your resort."
          noIndex={true}
        />
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4" aria-hidden="true">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Resort Not Found</h1>
            <p className="text-muted-foreground text-center mb-6">
              We couldn't find a resort with this link. Please check the URL or contact your resort for the correct link.
            </p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Resort is inactive
  if (resortInactive && resortInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <SEOHead
          title="Portal Unavailable"
          description="The guest portal for this resort is currently unavailable. Please contact the front desk."
          noIndex={true}
        />
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4" aria-hidden="true">
              <Building2 className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Portal Unavailable</h1>
            <p className="text-muted-foreground text-center mb-6">
              The guest portal for {resortInfo.name} is currently not available. Please contact your resort's front desk for assistance.
            </p>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session mismatch - guest is logged into a different resort
  if (guest && resortInfo && guest.resortId !== resortInfo.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <SEOHead
          title={`Login to ${resortInfo.name}`}
          description={`Access the guest portal for ${resortInfo.name}. Book activities and reserve restaurants during your resort stay.`}
          noIndex={true}
        />
        <div className="absolute top-4 right-4">
          <ThemeToggle className="text-muted-foreground hover:text-foreground" />
        </div>
        
        <Card className="w-full max-w-md shadow-elevated border-border/50">
          <CardContent className="flex flex-col items-center py-12">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4" aria-hidden="true">
              <AlertCircle className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Different Resort</h1>
            <p className="text-muted-foreground text-center mb-6">
              You are currently logged into a different resort. Please log out first to access {resortInfo.name}.
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

  // Apply custom colors via CSS variables if provided (from branding hook)
  const customStyles: React.CSSProperties = {};
  if (branding.login_primary_color) {
    customStyles['--resort-primary' as string] = branding.login_primary_color;
  }
  if (branding.login_accent_color) {
    customStyles['--resort-accent' as string] = branding.login_accent_color;
  }

  const title = branding.guest_login_title || `Welcome to ${branding.name || resortInfo?.name}`;
  const subtitle = branding.guest_login_subtitle || 'Access your resort experience';

  // Generate resort-specific structured data
  const resortSchema = resortInfo ? createResortSchema({
    name: resortInfo.name,
    code: resortInfo.code,
    logoUrl: branding.login_logo_url || undefined,
    description: `${resortInfo.name} - Luxury resort with digital guest portal powered by Propera`
  }) : undefined;

  return (
    <>
      <SEOHead
        title={`${resortInfo?.name || 'Resort'} Guest Portal`}
        description={`Access the guest portal for ${resortInfo?.name || 'your resort'}. Book activities, reserve restaurants, and manage your resort stay.`}
        canonicalUrl={`/resort/${code}/guest/login`}
        keywords={`${resortInfo?.name || ''} guest portal, resort booking, resort activities, restaurant reservations`}
        structuredData={resortSchema}
      />
      {!isOnline && <OfflineBanner />}
      <div 
        className={`min-h-screen flex flex-col items-center justify-center p-4 relative ${!isOnline ? 'pt-14' : ''}`}
        style={customStyles}
      >
      {/* Background - either hero image or gradient */}
      {branding.login_hero_image_url ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${branding.login_hero_image_url})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" aria-hidden="true" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
          </div>
        </>
      )}

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className={branding.login_hero_image_url ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"} />
      </div>

      <main className="w-full max-w-md relative z-10">
        {/* Header with logo or icon - uses branding from hook for immediate updates */}
        <header className="text-center mb-8">
          {branding.login_logo_url ? (
            <div className="mb-4">
              <img 
                src={branding.login_logo_url} 
                alt={`${branding.name || resortInfo?.name} logo`}
                className="h-16 mx-auto object-contain"
              />
            </div>
          ) : (
            <ProperaMark size={56} className="text-primary mb-4" />
          )}
          <h1 className={`text-2xl font-bold ${branding.login_hero_image_url ? 'text-white' : 'text-foreground'}`}>
            {title}
          </h1>
          <p className={`mt-1 ${branding.login_hero_image_url ? 'text-white/80' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        </header>

        <Card className="shadow-xl shadow-black/10 border-border/30 dark:bg-midnight-900 rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Use your room number and last name to view your schedule and make bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center h-5">Room Number</Label>
                  <Input 
                    placeholder="e.g., 101" 
                    value={formData.roomNumber} 
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} 
                    className="font-mono"
                    aria-label="Room number"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Last Name
                  </Label>
                  <Input 
                    placeholder="Smith" 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    aria-label="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                  aria-label="PIN code"
                />
              </div>
              
              {/* Custom instructions from branding */}
              {branding.guest_login_instructions && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {branding.guest_login_instructions}
                </p>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl glow-lime"
                style={branding.login_primary_color ? { 
                  backgroundColor: branding.login_primary_color,
                  borderColor: branding.login_primary_color 
                } : undefined}
                disabled={loading || !formData.roomNumber || !formData.lastName || !formData.pin}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                    {autoLoginAttempted ? 'Logging in via QR...' : 'Signing in...'}
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className={`text-center text-xs mt-6 ${branding.login_hero_image_url ? 'text-white/60' : 'text-muted-foreground'}`}>
          Need help? Please contact your front desk
        </p>
      </main>
    </div>
    </>
  );
}
