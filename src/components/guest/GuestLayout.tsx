import { Navigate, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useGuestAuth, GUEST_SESSION_KEY } from '@/contexts/GuestAuthContext';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import { useGuestDebugMode } from '@/hooks/useGuestDebugMode';
import { useResortBranding, getBrandingWithDefaults } from '@/hooks/useResortBranding';
import { useDemoInstanceGuard, clearDemoInstanceState } from '@/hooks/useDemoInstanceGuard';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { GuestRealtimeProvider } from '@/contexts/GuestRealtimeContext';
import { useGuestUnifiedRealtimeEnabled } from '@/hooks/useGuestUnifiedRealtimeEnabled';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { hexToHSL } from '@/lib/color-utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GuestNotificationBell } from '@/components/notifications/GuestNotificationBell';
import { GuestDebugConsole } from '@/components/guest/GuestDebugConsole';
import { GuestPortalGate } from '@/components/guest/GuestPortalGate';
import { GuestAccessGate } from '@/components/guest/GuestAccessGate';
import { GuestBottomNav } from '@/components/guest/GuestBottomNav';
import { GuestUpdatePrompt } from '@/components/guest/GuestUpdatePrompt';
import { GuestPWADebugOverlay } from '@/components/guest/GuestPWADebugOverlay';
import { GuestLayoutDebugOverlay } from '@/components/guest/GuestLayoutDebugOverlay';
import { DemoRefreshedModal } from '@/components/demo/DemoRefreshedModal';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  IconLogout,
} from '@/components/icons/ProperaIcons';
import { ProperaMark, ProperaLoader } from '@/components/icons/ProperaLogo';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { initErrorCapture } from '@/lib/debug-error-capture';
import { initQueryTracker } from '@/lib/debug-query-tracker';
import { SkipLink } from '@/components/a11y/SkipLink';
import { useGuestRoutePrefetch } from '@/hooks/useGuestRoutePrefetch';

// Store scroll positions per tab
const scrollPositions = new Map<string, number>();

export function GuestLayout() {
  const { guest, loading, logout } = useGuestAuth();
  const navigate = useNavigate();
  const { isPrearrival } = useIsPrearrivalGuest();
  const { showDebugPanel, isDebugMode } = useGuestDebugMode(guest?.resortId);
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const mainRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize debug trackers when debug mode is active (check URL directly to work during loading)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = urlParams.get('debug') === '1';
    if (!debugEnabled) return;
    
    const cleanupErrors = initErrorCapture();
    const cleanupQueries = initQueryTracker(queryClient);
    
    return () => {
      cleanupErrors();
      cleanupQueries();
    };
  }, [queryClient]);

  // Set initialized once loading completes (prevents flash)
  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  // Fetch branding dynamically from DB - this ensures immediate updates after staff saves
  const { data: brandingData } = useResortBranding(guest?.resortId);
  const branding = getBrandingWithDefaults(brandingData);

  // Convert branding colors to HSL for CSS variables
  const guestPrimaryHSL = hexToHSL(branding.login_primary_color);
  const guestAccentHSL = hexToHSL(branding.login_accent_color);

  // Enforce brand_theme when set by resort
  useEffect(() => {
    if (!branding.brand_theme || branding.brand_theme === 'AUTO') {
      // AUTO = follow system preference, don't force anything
      return;
    }
    
    if (branding.brand_theme === 'LIGHT') {
      setTheme('light');
    } else if (branding.brand_theme === 'DARK') {
      setTheme('dark');
    }
  }, [branding.brand_theme, setTheme]);

  // Check if loyalty program is enabled for this resort
  const { data: loyaltyProgram } = useQuery({
    queryKey: ['guest-loyalty-program', guest?.resortId],
    queryFn: async () => {
      if (!guest?.resortId) return null;
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('is_enabled')
        .eq('resort_id', guest.resortId)
        .eq('is_enabled', true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!guest?.resortId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const isLoyaltyEnabled = !!loyaltyProgram?.is_enabled;

  // Demo instance rotation guard
  const demoGuard = useDemoInstanceGuard(guest?.resortId, 'guest');

  const handleDemoRefreshContinue = useCallback(() => {
    clearDemoInstanceState('guest');
    localStorage.removeItem(GUEST_SESSION_KEY);
    demoGuard.dismiss();
    navigate('/guest/login');
  }, [demoGuard, navigate]);

  // Get current path for scroll tracking
  const currentTab = location.pathname;

  // Track scroll for header shadow
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      scrollPositions.set(currentTab, main.scrollTop);
      setIsScrolled(main.scrollTop > 10);
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, [currentTab]);

  // Restore scroll position when tab changes
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const savedPosition = scrollPositions.get(currentTab);
    if (savedPosition !== undefined) {
      requestAnimationFrame(() => {
        main.scrollTop = savedPosition;
      });
    } else {
      main.scrollTop = 0;
    }
    setIsScrolled(false);
  }, [currentTab]);

  if (loading || !isInitialized) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center hero-pattern">
          <ProperaLoader size={64} text="Loading your experience..." />
        </div>
        {showDebugPanel && <GuestDebugConsole />}
      </>
    );
  }

  if (!guest) {
    // Preserve the current path so entry route can redirect back via resort login
    const returnTo = location.pathname + location.search;
    const entryUrl = returnTo && returnTo !== '/guest' && returnTo !== '/guest/'
      ? `/guest/entry?next=${encodeURIComponent(returnTo)}`
      : '/guest/entry';
    return (
      <>
        {showDebugPanel && <GuestDebugConsole />}
        <Navigate to={entryUrl} replace />
      </>
    );
  }

  // Build CSS variable overrides for guest branding
  const brandingStyles: React.CSSProperties = {};
  if (guestPrimaryHSL) {
    (brandingStyles as Record<string, string>)['--guest-primary'] = guestPrimaryHSL;
  }
  if (guestAccentHSL) {
    (brandingStyles as Record<string, string>)['--guest-accent'] = guestAccentHSL;
  }
  // Apply enhanced branding styles
  if (branding.brand_corner_radius !== null && branding.brand_corner_radius !== undefined) {
    (brandingStyles as Record<string, string>)['--guest-radius'] = `${branding.brand_corner_radius}px`;
  }
  if (branding.brand_button_style) {
    const buttonRadius = branding.brand_button_style === 'pill' ? '9999px' 
      : branding.brand_button_style === 'squared' ? '4px' 
      : `${branding.brand_corner_radius ?? 12}px`;
    (brandingStyles as Record<string, string>)['--guest-button-radius'] = buttonRadius;
  }
  if (branding.brand_font_family) {
    (brandingStyles as Record<string, string>)['fontFamily'] = `"${branding.brand_font_family}", sans-serif`;
  }
  if (branding.brand_background_tint) {
    (brandingStyles as Record<string, string>)['--guest-bg-tint'] = branding.brand_background_tint;
  }

  return (
    <FeatureFlagsProvider resortId={guest?.resortId} guestId={guest?.guestId}>
      <DemoRefreshedModal 
        open={demoGuard.isStale} 
        variant="guest" 
        onContinue={handleDemoRefreshContinue} 
      />
      <GuestLayoutInner
        guest={guest}
        branding={branding}
        brandingStyles={brandingStyles}
        isScrolled={isScrolled}
        mainRef={mainRef}
        isLoyaltyEnabled={isLoyaltyEnabled}
        showDebugPanel={showDebugPanel}
        logout={logout}
        t={t}
      />
    </FeatureFlagsProvider>
  );
}

// Inner component that has access to FeatureFlagsProvider context
interface GuestLayoutInnerProps {
  guest: NonNullable<ReturnType<typeof useGuestAuth>['guest']>;
  branding: ReturnType<typeof getBrandingWithDefaults>;
  brandingStyles: React.CSSProperties;
  isScrolled: boolean;
  mainRef: React.RefObject<HTMLElement>;
  isLoyaltyEnabled: boolean;
  showDebugPanel: boolean;
  logout: () => void;
  t: (key: string) => string;
}

function GuestLayoutInner({
  guest,
  branding,
  brandingStyles,
  isScrolled,
  mainRef,
  isLoyaltyEnabled,
  showDebugPanel,
  logout,
  t,
}: GuestLayoutInnerProps) {
  // Check if unified realtime is enabled (inside FeatureFlagsProvider)
  const enableUnifiedRealtime = useGuestUnifiedRealtimeEnabled();

  // Prefetch key guest routes during idle time
  useGuestRoutePrefetch();
  
  // Determine if we can safely mount the provider
  const canMountProvider = !!(guest?.guestId && guest?.resortId);

  const content = (
    <GuestAccessGate resortName={guest?.resortName}>
      <SkipLink />
      <div 
        className="guest-branded guest-page-bg fixed left-0 right-0 top-0 h-[100dvh] flex flex-col bg-background overflow-hidden"
        style={brandingStyles}
      >
        {/* Mobile-optimized Header with glassmorphism */}
        <header className={cn(
          "flex-shrink-0 z-20 surface-glass-strong border-b transition-all duration-200 safe-area-inset-top",
          isScrolled ? "border-border/30 shadow-md" : "border-transparent"
        )}>
          <div className="flex h-14 sm:h-16 items-center justify-between px-4 max-w-lg md:max-w-2xl xl:max-w-4xl mx-auto">
            <Link 
              to={GUEST_ROUTES.PROFILE} 
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 group"
            >
              {/* Use branding logo from DB (fresh on each load) */}
              {branding.login_logo_url ? (
                <img 
                  src={branding.login_logo_url} 
                  alt={branding.name || guest?.resortName || 'Resort'} 
                  loading="eager"
                  decoding="async"
                  className="h-10 w-10 object-contain flex-shrink-0 rounded-lg transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-105">
                  <ProperaMark size={28} className="text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {String(branding.name || guest?.resortName || 'Guest Portal')}
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                  Room {String(guest?.roomNumber || '')}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <ThemeToggle className="text-muted-foreground hover:text-foreground h-9 w-9 sm:h-10 sm:w-10 tap-target" aria-label={t('a11y.toggleTheme')} />
              <GuestNotificationBell />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout}
                className="text-muted-foreground hover:text-foreground rounded-xl h-9 w-9 sm:h-10 sm:w-10 tap-target"
                aria-label={t('nav.logout')}
              >
                <IconLogout className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main scroll container — single scroll area for the entire page.
             Safe bottom padding is handled by GuestPageShell per-page (not here)
             to avoid double-padding. scroll-padding-bottom ensures scrollIntoView
             targets don't land behind fixed bars. */}
        <main 
          id="main-content"
          tabIndex={-1}
          ref={mainRef} 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden focus:outline-none"
          style={{ scrollPaddingBottom: 'var(--guest-safe-bottom)' }}
        >
          <div className="p-4 md:p-6 xl:p-8 max-w-lg md:max-w-2xl xl:max-w-4xl mx-auto animate-fade-in contain-layout">
            <GuestPortalGate>
              <Outlet />
            </GuestPortalGate>
          </div>
        </main>

        {/* Mobile-optimized Bottom Navigation - feature-flag gated */}
        <GuestBottomNav isLoyaltyEnabled={isLoyaltyEnabled} />

        {/* PWA update prompt */}
        <GuestUpdatePrompt />

        {/* Debug Console - only shown with ?debug=1 */}
        {showDebugPanel && <GuestDebugConsole />}

        {/* Layout Debug Overlay - only shown with ?debugLayout=1 */}
        <GuestLayoutDebugOverlay />

        {/* PWA Debug Overlay - only shown with ?pwaDebug=1 */}
        <GuestPWADebugOverlay />
      </div>
    </GuestAccessGate>
  );

  // Wrap with unified realtime provider if enabled and IDs are available
  if (canMountProvider && enableUnifiedRealtime) {
    return (
      <GuestRealtimeProvider 
        guestId={guest.guestId} 
        resortId={guest.resortId} 
        enabled={true}
      >
        {content}
      </GuestRealtimeProvider>
    );
  }

  return content;
}
