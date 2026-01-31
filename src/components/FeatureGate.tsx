/**
 * FeatureGate Component
 * 
 * Centralized feature flag gating with premium fallback UI.
 * Wraps any content that should only render when specific flags are enabled.
 * 
 * Usage:
 *   <FeatureGate requiredFlags={['enable_transport']}>
 *     <TransportDashboard />
 *   </FeatureGate>
 * 
 *   <FeatureGate 
 *     requiredFlags={['enable_loyalty', 'enable_loyalty_points']} 
 *     mode="guest"
 *   >
 *     <LoyaltyRewards />
 *   </FeatureGate>
 */

import React from 'react';
import { useFeatureFlagAccess, useFeatureFlagAccessSafe } from '@/providers/FeatureFlagsProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Settings, 
  ShieldAlert, 
  Sparkles,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  /** Feature flag keys that must ALL be effectively enabled */
  requiredFlags: string[];
  /** Portal mode affects the disabled screen messaging */
  mode?: 'staff' | 'guest';
  /** Custom fallback to render when disabled (overrides default screen) */
  fallback?: React.ReactNode;
  /** Show which flags caused the block (only visible to Super Admin) */
  showDetailsForSuperAdmin?: boolean;
  /** Children to render when all flags are enabled */
  children: React.ReactNode;
}

export function FeatureGate({
  requiredFlags,
  mode = 'staff',
  fallback,
  showDetailsForSuperAdmin = false,
  children,
}: FeatureGateProps) {
  const flagContext = useFeatureFlagAccessSafe();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = profile?.global_role === 'SUPER_ADMIN';

  // If no provider, render children (fail open for backwards compatibility)
  // This allows gradual adoption without breaking existing code
  if (!flagContext) {
    if (import.meta.env.DEV) {
      console.warn(
        '[FeatureGate] No FeatureFlagsProvider found. Rendering children by default.',
        { requiredFlags }
      );
    }
    return <>{children}</>;
  }

  const { loading, isEnabledEffective } = flagContext;

  // Loading state
  if (loading) {
    return <FeatureGateLoader />;
  }

  // Check all required flags
  const flagStatuses = requiredFlags.map(key => ({
    key,
    enabled: isEnabledEffective(key),
  }));

  const allEnabled = flagStatuses.every(f => f.enabled);
  const disabledFlags = flagStatuses.filter(f => !f.enabled);

  // All flags enabled - render children
  if (allEnabled) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default disabled screen
  return (
    <ModuleDisabledScreen
      mode={mode}
      disabledFlags={disabledFlags}
      showDetails={showDetailsForSuperAdmin && isSuperAdmin}
      onBack={() => navigate(-1)}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════

function FeatureGateLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-primary/10" />
        </div>
        <div className="space-y-2 text-center">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-48 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE DISABLED SCREEN
// ═══════════════════════════════════════════════════════════════════════════

interface ModuleDisabledScreenProps {
  mode: 'staff' | 'guest';
  disabledFlags: Array<{ key: string; enabled: boolean }>;
  showDetails: boolean;
  onBack: () => void;
}

function ModuleDisabledScreen({ 
  mode, 
  disabledFlags, 
  showDetails, 
  onBack 
}: ModuleDisabledScreenProps) {
  const isGuest = mode === 'guest';

  return (
    <div className={cn(
      "flex items-center justify-center min-h-[60vh] p-4 sm:p-6",
      isGuest ? "guest-page-bg" : ""
    )}>
      <Card className={cn(
        "w-full max-w-md relative overflow-hidden",
        "border-border/50 shadow-xl",
        // Premium glassmorphism effect
        "bg-gradient-to-br from-card/95 via-card to-card/90",
        "backdrop-blur-xl"
      )}>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        
        {/* Subtle glow effect at top */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="relative text-center pb-2">
          {/* Icon container with premium styling */}
          <div className="mx-auto mb-4 relative">
            <div className={cn(
              "h-20 w-20 rounded-3xl flex items-center justify-center",
              "bg-gradient-to-br from-muted/80 to-muted",
              "border border-border/50 shadow-lg",
              "ring-4 ring-background/50"
            )}>
              <Lock className="h-9 w-9 text-muted-foreground" />
            </div>
            {/* Sparkle accent */}
            <div className="absolute -top-1 -right-1">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>

          <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
            Feature Not Available
          </CardTitle>
          
          <CardDescription className="text-sm sm:text-base mt-2 max-w-sm mx-auto">
            {isGuest ? (
              <>
                This feature is not currently available at your resort. 
                Please check back later or contact the front desk for assistance.
              </>
            ) : (
              <>
                This module has been disabled for your resort. 
                Contact your Resort Admin or Super Admin to enable this feature.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-4 pt-2">
          {/* Super Admin details panel */}
          {showDetails && disabledFlags.length > 0 && (
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Details</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  The following flags are required but not enabled:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {disabledFlags.map(flag => (
                    <Badge 
                      key={flag.key} 
                      variant="outline" 
                      className="text-[10px] font-mono bg-destructive/10 text-destructive border-destructive/30"
                    >
                      {flag.key}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            {!isGuest && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => window.open('/staff/settings/modules', '_self')}
              >
                <Settings className="h-4 w-4" />
                Manage Modules
              </Button>
            )}
          </div>

          {/* Help text */}
          <div className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              {isGuest 
                ? "Some features may be seasonally available or require a special package."
                : "Module availability is controlled by your organization's subscription and admin settings."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simple inline check - returns null if not enabled
 * Use for conditionally rendering small UI elements
 */
export function FeatureVisible({ 
  flag, 
  children 
}: { 
  flag: string; 
  children: React.ReactNode;
}) {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) return <>{children}</>;
  if (flagContext.loading) return null;
  if (!flagContext.isEnabledEffective(flag)) return null;
  
  return <>{children}</>;
}

/**
 * Hook for manual feature checks in component logic
 */
export function useFeatureEnabled(flag: string): boolean {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) return true; // Fail open
  if (flagContext.loading) return false;
  
  return flagContext.isEnabledEffective(flag);
}

/**
 * Hook for checking multiple features
 */
export function useFeaturesEnabled(flags: string[]): {
  loading: boolean;
  allEnabled: boolean;
  enabledMap: Record<string, boolean>;
} {
  const flagContext = useFeatureFlagAccessSafe();
  
  if (!flagContext) {
    return {
      loading: false,
      allEnabled: true,
      enabledMap: Object.fromEntries(flags.map(f => [f, true])),
    };
  }

  const enabledMap: Record<string, boolean> = {};
  for (const flag of flags) {
    enabledMap[flag] = flagContext.isEnabledEffective(flag);
  }

  return {
    loading: flagContext.loading,
    allEnabled: Object.values(enabledMap).every(Boolean),
    enabledMap,
  };
}
