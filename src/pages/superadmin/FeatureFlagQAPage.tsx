/**
 * Feature Flag QA Checklist Page
 * 
 * DEV-ONLY page for validating feature flag behavior across modules.
 * Shows current scope, module flags, nav visibility, and route accessibility.
 * 
 * Access: /superadmin/feature-flags/qa (only visible in development)
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlagAccess } from '@/providers/FeatureFlagsProvider';
import { MODULES, buildModuleViewModels } from '@/lib/feature-flag-modules';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Route,
  ShieldCheck,
  RefreshCw,
  Bug,
  Layers,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Route definitions for each module
const MODULE_ROUTES: Record<string, { path: string; label: string }[]> = {
  dashboards: [
    { path: '/staff/dashboard', label: 'Dashboard Home' },
  ],
  guests: [
    { path: '/staff/guests', label: 'Guests List' },
  ],
  requests: [
    { path: '/staff/requests', label: 'Service Requests' },
  ],
  transport: [
    { path: '/staff/transport', label: 'Transport Dashboard' },
    { path: '/staff/transport/fleet', label: 'Fleet Management' },
    { path: '/staff/transport/routes', label: 'Routes' },
  ],
  prearrival: [
    { path: '/staff/prearrival', label: 'Pre-Arrival' },
  ],
  reports: [
    { path: '/staff/reports', label: 'Reports' },
  ],
  loyalty: [
    { path: '/staff/loyalty', label: 'Loyalty Members' },
  ],
  guest_portal: [
    { path: '/guest/home', label: 'Guest Home' },
  ],
};

// Nav visibility mapping (simplified check)
const MODULE_NAV_ITEMS: Record<string, string[]> = {
  dashboards: ['Home'],
  guests: ['Guests'],
  requests: ['Requests'],
  transport: ['Transport'],
  prearrival: ['Pre-Arrival'],
  reports: ['Reports'],
  loyalty: ['Loyalty'],
  guest_portal: ['Guest Portal'],
};

export default function FeatureFlagQAPage() {
  const { currentResort } = useResort();
  const { profile, isSuperAdmin } = useAuth();
  const flagContext = useFeatureFlagAccess();
  const { data: flags, refetch, isLoading } = useFeatureFlags(currentResort?.id);

  const moduleViewModels = useMemo(() => {
    return buildModuleViewModels(flags || [], !!currentResort?.id);
  }, [flags, currentResort?.id]);

  // Only show in dev or for super admins
  const isDev = import.meta.env.DEV;
  if (!isDev && !isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This page is only available in development mode or for Super Admins.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-7 w-7 text-warning" />
            Feature Flag QA Checklist
          </h1>
          <p className="text-muted-foreground mt-1">
            Validate flag behavior across modules and routes
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Context Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-info" />
            Current Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Resort Scope</span>
              <p className="font-medium">
                {currentResort ? currentResort.name : 'Global (No Resort Selected)'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Resort ID</span>
              <p className="font-mono text-xs">
                {flagContext.resortId || 'None'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">User Role</span>
              <p className="font-medium">
                {profile?.global_role || 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conventions Reference */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-warning" />
            Code Conventions
          </CardTitle>
          <CardDescription>
            Follow these patterns for consistent feature gating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-medium">✅ DO:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Use <code className="bg-muted px-1 rounded">&lt;FeatureGate requiredFlags=&#123;[...]&#125;&gt;</code> for route/page gating</li>
              <li>Use <code className="bg-muted px-1 rounded">&lt;FeatureVisible flag="..."&gt;</code> for inline UI elements</li>
              <li>Use <code className="bg-muted px-1 rounded">useFeatureEnabled('flag')</code> for conditional logic in hooks</li>
              <li>Access flags via <code className="bg-muted px-1 rounded">useFeatureFlagAccess()</code> from provider</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-destructive">❌ DON'T:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
              <li>Call <code className="bg-muted px-1 rounded">useFeatureFlags()</code> directly in leaf components</li>
              <li>Duplicate flag checks across multiple components</li>
              <li>Gate at both route AND component level (pick one)</li>
              <li>Forget to wrap portals with <code className="bg-muted px-1 rounded">&lt;FeatureFlagsProvider&gt;</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Module Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Module Status Checklist
          </CardTitle>
          <CardDescription>
            Verify each module's master flag, subfeatures, nav visibility, and route access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {moduleViewModels.map(module => {
            const masterEnabled = module.masterFlag?.is_enabled ?? false;
            const routes = MODULE_ROUTES[module.definition.key] || [];
            const navItems = MODULE_NAV_ITEMS[module.definition.key] || [];
            
            return (
              <div 
                key={module.definition.key}
                className={cn(
                  "rounded-lg border p-4 space-y-3",
                  masterEnabled ? "bg-success/5 border-success/30" : "bg-muted/30 border-border"
                )}
              >
                {/* Module Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon enabled={masterEnabled} />
                    <div>
                      <p className="font-semibold">{module.definition.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {module.definition.masterFlagKey}
                      </p>
                    </div>
                  </div>
                  <Badge variant={masterEnabled ? "default" : "secondary"}>
                    {masterEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>

                <Separator />

                {/* Subfeatures */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Subfeatures ({module.enabledChildCount}/{module.totalChildCount})
                    </p>
                    {module.childFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {module.childFlags.map(flag => (
                          <Badge 
                            key={flag.key}
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              flag.is_enabled && masterEnabled
                                ? "bg-success/10 text-success border-success/30"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {flag.is_enabled && masterEnabled ? (
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            ) : (
                              <XCircle className="h-2.5 w-2.5 mr-1" />
                            )}
                            {flag.key.replace(`enable_${module.definition.key}_`, '')}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No subfeatures</p>
                    )}
                  </div>

                  {/* Nav Visibility */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      {masterEnabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      Nav Visibility
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {navItems.map(item => (
                        <Badge 
                          key={item}
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            masterEnabled 
                              ? "bg-info/10 text-info border-info/30" 
                              : "bg-muted text-muted-foreground line-through"
                          )}
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Routes */}
                {routes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      Route Accessibility
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {routes.map(route => (
                        <Link
                          key={route.path}
                          to={route.path}
                          className={cn(
                            "text-xs px-2 py-1 rounded border transition-colors",
                            masterEnabled
                              ? "bg-success/10 border-success/30 text-success hover:bg-success/20"
                              : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                          )}
                        >
                          {route.label}
                          <span className="ml-1 opacity-50">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Override indicator */}
                {module.hasOverrides && (
                  <div className="flex items-center gap-2 pt-2">
                    <AlertCircle className="h-3.5 w-3.5 text-info" />
                    <span className="text-xs text-info">
                      {module.overrideCount} resort override{module.overrideCount !== 1 ? 's' : ''} active
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Manual Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Acceptance Tests</CardTitle>
          <CardDescription>
            Verify these scenarios after making changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <TestCase 
              label="Master OFF → Children OFF"
              description="Toggle enable_transport OFF globally → all transport subfeatures should be effectively disabled, nav hidden, routes blocked"
            />
            <TestCase 
              label="Resort Override"
              description="Override enable_transport ON for Resort X → only Resort X sees transport nav/routes, other resorts don't"
            />
            <TestCase 
              label="Child Independence"
              description="With master ON, toggle a subfeature OFF → only that specific UI element should hide"
            />
            <TestCase 
              label="Bulk Actions"
              description="Use 'Enable All' on a module → all subfeatures should enable; 'Reset Overrides' should revert to global"
            />
            <TestCase 
              label="Guest Portal Gating"
              description="With disable_guest_access ON → guest portal shows maintenance screen"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/superadmin/feature-flags">
            ← Back to Feature Flags
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Helper Components

function StatusIcon({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
      <CheckCircle2 className="h-4 w-4 text-success" />
    </div>
  ) : (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
      <XCircle className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function TestCase({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
