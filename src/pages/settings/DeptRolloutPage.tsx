/**
 * DeptRolloutPage — Admin-only panel for rolling out dept_scope_v2
 * and ops_events_adapter per-resort with diff preview.
 */
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useResolvedFeatureFlags, useToggleFeatureFlag } from '@/hooks/useFeatureFlags';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppToolbar, AppBanner, AppCard } from '@/components/ui/app-kit';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Rocket,
  CalendarIcon,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Info,
  Undo2,
} from 'lucide-react';

const ROLLOUT_FLAGS = [
  {
    key: 'dept_scope_v2_enabled',
    label: 'Department Scope v2',
    description: 'Use department_bindings as scope source of truth instead of legacy category map. Enables fine-grained binding configuration per department.',
    icon: Layers,
    safetyNote: 'Rollback is instant — legacy scope logic resumes immediately when disabled. No data loss: bindings persist in the database.',
  },
  {
    key: 'ops_events_adapter_enabled',
    label: 'Ops Events Adapter',
    description: 'Normalise all ops page data through the adapter layer (OpsEvent stream). Planner, Master Sheet, and Inbox use the unified pipeline.',
    icon: Activity,
    safetyNote: 'Rollback is instant — pages revert to direct table queries. Adapter data is stateless (no persistent side-effects).',
  },
] as const;

export default function DeptRolloutPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  const currentRole = resortId ? getResortRole(resortId) : null;
  const canManage = isSuperAdmin() || currentRole === 'RESORT_ADMIN';

  const { flagsMap, isLoading: flagsLoading, refetch: refetchFlags } = useResolvedFeatureFlags(resortId);
  const toggleFlag = useToggleFeatureFlag();

  // Diff preview state
  const [diffDate, setDiffDate] = useState<Date>(new Date());
  const [showDiff, setShowDiff] = useState(false);

  if (!currentResort) {
    return (
      <div className="space-y-4 animate-fade-in">
        <AppToolbar title="Dept Rollout" subtitle="Select a resort to manage rollout flags" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-4 animate-fade-in">
        <AppToolbar title="Dept Rollout" />
        <AppBanner variant="warning" icon={AlertTriangle} title="Access denied">
          Only Resort Admins or Super Admins can manage rollout flags.
        </AppBanner>
      </div>
    );
  }

  const handleToggle = async (flagKey: string, newValue: boolean) => {
    try {
      await toggleFlag.mutateAsync({
        flagKey,
        isEnabled: newValue,
        resortId,
      });
      refetchFlags();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <AppToolbar
        title="Dept Rollout"
        subtitle={`${currentResort.name} — Feature flag cutover`}
      />

      {/* Safety banner */}
      <AppBanner variant="info" icon={Info} title="Safe rollout">
        Both flags are resort-scoped. Toggling OFF instantly reverts to legacy behaviour.
        No data is lost — bindings and modules persist regardless of flag state.
      </AppBanner>

      {/* Flag toggles */}
      <div className="grid gap-4">
        {ROLLOUT_FLAGS.map(flag => {
          const isEnabled = flagsMap[flag.key] ?? false;
          const Icon = flag.icon;

          return (
            <Card key={flag.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors shrink-0 ${
                      isEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {flag.label}
                        <Badge
                          variant={isEnabled ? 'default' : 'secondary'}
                          className={`text-xs ${isEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}`}
                        >
                          {isEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {flag.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {flagsLoading ? (
                      <Skeleton className="h-6 w-11" />
                    ) : (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                        disabled={toggleFlag.isPending}
                        aria-label={`Toggle ${flag.label}`}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <Undo2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{flag.safetyNote}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Diff preview */}
      <DiffPreviewSection
        resortId={resortId!}
        date={diffDate}
        onDateChange={setDiffDate}
        showDiff={showDiff}
        onToggleDiff={() => setShowDiff(!showDiff)}
        adapterEnabled={flagsMap['ops_events_adapter_enabled'] ?? false}
      />

      {/* Help text */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">Rollout playbook</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Enable <strong>dept_scope_v2</strong> first — validate bindings render correctly in Dept Settings</li>
          <li>Run a diff preview on a busy day to confirm event counts match</li>
          <li>Enable <strong>ops_events_adapter</strong> — validate Planner, Master Sheet, Inbox</li>
          <li>If any regression, toggle OFF instantly — no data migration needed</li>
          <li>Once stable, repeat for remaining resorts</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Diff Preview Section ────────────────────────────────────────

function DiffPreviewSection({
  resortId,
  date,
  onDateChange,
  showDiff,
  onToggleDiff,
  adapterEnabled,
}: {
  resortId: string;
  date: Date;
  onDateChange: (d: Date) => void;
  showDiff: boolean;
  onToggleDiff: () => void;
  adapterEnabled: boolean;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');

  // Legacy count: direct query
  const { data: legacyCount, isLoading: legacyLoading } = useQuery({
    queryKey: ['rollout-diff-legacy', resortId, dateStr],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activity_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('resort_id', resortId)
        .eq('date', dateStr);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: showDiff,
  });

  // Adapter count: run activities adapter
  const { data: adapterCount, isLoading: adapterLoading } = useQuery({
    queryKey: ['rollout-diff-adapter', resortId, dateStr],
    queryFn: async () => {
      const { ActivitiesOpsAdapter } = await import('@/lib/ops/adapters/activities-ops-adapter');
      const events = await ActivitiesOpsAdapter.getOpsEvents({
        resortId,
        dateRange: { start: dateStr, end: dateStr },
        scope: { activityCategoryKeys: [], restaurantIds: [] },
      });
      return events.length;
    },
    enabled: showDiff,
  });

  const isLoading = legacyLoading || adapterLoading;
  const match = legacyCount != null && adapterCount != null && legacyCount === adapterCount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Diff Preview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(date, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && onDateChange(d)}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant={showDiff ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onToggleDiff}
            >
              <Database className="h-3.5 w-3.5" />
              {showDiff ? 'Hide' : 'Run Diff'}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Compare legacy session count vs adapter event count for a selected day
        </CardDescription>
      </CardHeader>
      {showDiff && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DiffCard
              label="Legacy (direct query)"
              count={legacyCount}
              loading={legacyLoading}
              variant="muted"
            />
            <DiffCard
              label="Adapter (OpsEvent)"
              count={adapterCount}
              loading={adapterLoading}
              variant={adapterEnabled ? 'active' : 'muted'}
            />
          </div>

          {!isLoading && legacyCount != null && adapterCount != null && (
            <div className={`flex items-center gap-2 text-sm rounded-lg p-3 ${
              match
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-warning/10 text-warning'
            }`}>
              {match ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Counts match — safe to enable adapter</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Mismatch: {legacyCount} legacy vs {adapterCount} adapter.
                    {adapterCount! < legacyCount!
                      ? ' Check if department scope is filtering sessions.'
                      : ' Adapter may include additional sources.'}
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function DiffCard({
  label,
  count,
  loading,
  variant,
}: {
  label: string;
  count: number | undefined;
  loading: boolean;
  variant: 'muted' | 'active';
}) {
  return (
    <div className={`rounded-xl border p-4 text-center ${
      variant === 'active'
        ? 'bg-primary/5 border-primary/20'
        : 'bg-muted/30 border-border/30'
    }`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-16 mx-auto" />
      ) : (
        <p className="text-2xl font-bold tabular-nums">{count ?? '—'}</p>
      )}
    </div>
  );
}
