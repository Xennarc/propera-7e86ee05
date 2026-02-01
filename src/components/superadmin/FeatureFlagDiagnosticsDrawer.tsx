/**
 * Feature Flag Diagnostics Drawer
 * 
 * Super Admin tool to diagnose effective feature flag resolution for any resort.
 * Shows global values, resort overrides, parent dependencies, and simulates
 * Guest Portal visibility logic.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useFeatureFlags,
  getParentModuleKey,
  isEnabledEffective,
  buildFlagsMap,
  type FeatureFlag,
} from '@/hooks/useFeatureFlags';
import { useGuestFeatureFlags } from '@/hooks/useGuestFeatureFlags';
import { cn } from '@/lib/utils';
import {
  Stethoscope,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Home,
  Car,
  Bell,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticRow {
  key: string;
  label: string;
  category: string;
  globalValue: boolean | null;
  resortOverride: boolean | null;
  effective: boolean;
  parentKey: string | null;
  parentEffective: boolean | null;
  hasOverride: boolean;
}

export function FeatureFlagDiagnosticsDrawer() {
  const { resorts } = useResort();
  const [open, setOpen] = useState(false);
  const [selectedResortId, setSelectedResortId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch global flags (no resort filter)
  const { 
    data: globalFlags, 
    isLoading: globalLoading 
  } = useFeatureFlags();

  // Fetch resort-resolved flags (merged global + overrides)
  const { 
    data: resolvedFlags, 
    isLoading: resolvedLoading,
    refetch: refetchResolved,
  } = useFeatureFlags(selectedResortId || undefined);

  // Fetch via guest RPC (to test guest portal access)
  const {
    data: guestFlags,
    isLoading: guestLoading,
    error: guestError,
    refetch: refetchGuest,
  } = useGuestFeatureFlags(selectedResortId || undefined, undefined);

  const isLoading = globalLoading || (selectedResortId && resolvedLoading);

  // Build diagnostic rows
  const diagnosticRows = useMemo((): DiagnosticRow[] => {
    if (!globalFlags || !resolvedFlags) return [];

    const globalMap = buildFlagsMap(globalFlags);
    const resolvedMap = buildFlagsMap(resolvedFlags);

    // Build a map of resort overrides for comparison
    const overrideKeys = new Set(
      resolvedFlags
        .filter(f => f.resort_id === selectedResortId)
        .map(f => f.key)
    );

    return resolvedFlags.map((flag): DiagnosticRow => {
      const parentKey = getParentModuleKey(flag.key);
      const parentEffective = parentKey ? isEnabledEffective(parentKey, resolvedMap) : null;
      const effective = isEnabledEffective(flag.key, resolvedMap);

      return {
        key: flag.key,
        label: flag.label,
        category: flag.category,
        globalValue: globalMap[flag.key] ?? null,
        resortOverride: overrideKeys.has(flag.key) ? flag.is_enabled : null,
        effective,
        parentKey,
        parentEffective,
        hasOverride: overrideKeys.has(flag.key),
      };
    });
  }, [globalFlags, resolvedFlags, selectedResortId]);

  // Filter by search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return diagnosticRows;
    const q = searchQuery.toLowerCase();
    return diagnosticRows.filter(
      r => r.key.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    );
  }, [diagnosticRows, searchQuery]);

  // Guest Home Simulation
  const guestHomeSimulation = useMemo(() => {
    if (!resolvedFlags) return null;

    const resolvedMap = buildFlagsMap(resolvedFlags);
    const transportEnabled = isEnabledEffective('enable_transport_guest_booking', resolvedMap);
    const requestsEnabled = isEnabledEffective('enable_requests_guest_submit', resolvedMap);

    // Mirror GuestQuickActions logic
    const buggyShown = transportEnabled;
    // In nav: both can coexist. In quick actions grid: requests only shows if transport is disabled
    const requestsInQuickActions = requestsEnabled && !transportEnabled;
    const requestsInNav = requestsEnabled;

    return {
      transportEnabled,
      requestsEnabled,
      buggyShown,
      requestsInQuickActions,
      requestsInNav,
    };
  }, [resolvedFlags]);

  // RPC test results
  const guestRpcStatus = useMemo(() => {
    if (!selectedResortId) return { status: 'no-resort', count: 0, error: null };
    if (guestLoading) return { status: 'loading', count: 0, error: null };
    if (guestError) return { status: 'error', count: 0, error: (guestError as Error).message };
    return { status: 'success', count: guestFlags?.length ?? 0, error: null };
  }, [selectedResortId, guestLoading, guestError, guestFlags]);

  const selectedResort = resorts.find(r => r.id === selectedResortId);

  const handleCopyResortId = () => {
    if (selectedResortId) {
      navigator.clipboard.writeText(selectedResortId);
      toast.success('Resort ID copied');
    }
  };

  const handleRefresh = () => {
    refetchResolved();
    if (selectedResortId) {
      refetchGuest();
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Stethoscope className="h-4 w-4" />
          Diagnostics
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Feature Flag Diagnostics
          </SheetTitle>
          <SheetDescription>
            Inspect effective flag resolution and parent dependencies
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Resort Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Resort</label>
              <div className="flex gap-2">
                <Select value={selectedResortId} onValueChange={setSelectedResortId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a resort to diagnose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resorts.map(resort => (
                      <SelectItem key={resort.id} value={resort.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {resort.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefresh}
                  disabled={!selectedResortId}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {selectedResortId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    {selectedResortId}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyResortId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            {selectedResortId && !isLoading && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{diagnosticRows.length}</div>
                    <div className="text-xs text-muted-foreground">Total Flags</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">
                      {diagnosticRows.filter(r => r.effective).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Enabled</div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-info">
                      {diagnosticRows.filter(r => r.hasOverride).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Overrides</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Guest RPC Status */}
            {selectedResortId && (
              <Card className={cn(
                "border",
                guestRpcStatus.status === 'error' && "border-destructive bg-destructive/5",
                guestRpcStatus.status === 'success' && "border-success/50 bg-success/5"
              )}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Guest RPC Status
                    {guestRpcStatus.status === 'loading' && (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    )}
                    {guestRpcStatus.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                    {guestRpcStatus.status === 'error' && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4 text-xs">
                  {guestRpcStatus.status === 'success' && (
                    <span className="text-muted-foreground">
                      get_effective_feature_flags returned {guestRpcStatus.count} flags
                    </span>
                  )}
                  {guestRpcStatus.status === 'error' && (
                    <div className="text-destructive font-mono bg-destructive/10 p-2 rounded">
                      {guestRpcStatus.error}
                    </div>
                  )}
                  {guestRpcStatus.status === 'no-resort' && (
                    <span className="text-muted-foreground">Select a resort to test</span>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Guest Home Simulation */}
            {selectedResortId && guestHomeSimulation && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Simulate Guest Home
                  </CardTitle>
                  <CardDescription className="text-xs">
                    What GuestQuickActions and GuestBottomNav would render
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-3 px-4 space-y-3">
                  {/* Raw flag values */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Effective Values</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="font-mono text-xs">enable_transport_guest_booking</span>
                        <Badge variant={guestHomeSimulation.transportEnabled ? 'default' : 'secondary'} className="text-[10px]">
                          {guestHomeSimulation.transportEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="font-mono text-xs">enable_requests_guest_submit</span>
                        <Badge variant={guestHomeSimulation.requestsEnabled ? 'default' : 'secondary'} className="text-[10px]">
                          {guestHomeSimulation.requestsEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Rendered elements */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">UI Visibility</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border",
                        guestHomeSimulation.buggyShown 
                          ? "bg-success/10 border-success/30 text-success" 
                          : "bg-muted/30 border-border/50 text-muted-foreground"
                      )}>
                        <Car className="h-5 w-5" />
                        <div>
                          <div className="font-medium text-sm">Buggy (Quick Actions)</div>
                          <div className="text-[10px] uppercase">
                            {guestHomeSimulation.buggyShown ? 'Shown' : 'Hidden'}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border",
                        guestHomeSimulation.requestsInQuickActions 
                          ? "bg-success/10 border-success/30 text-success" 
                          : "bg-muted/30 border-border/50 text-muted-foreground"
                      )}>
                        <Bell className="h-5 w-5" />
                        <div>
                          <div className="font-medium text-sm">Requests (Quick Actions)</div>
                          <div className="text-[10px] uppercase">
                            {guestHomeSimulation.requestsInQuickActions ? 'Shown' : 'Hidden (priority rule)'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Nav */}
                    <div className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Bottom Nav:</span>{' '}
                      Buggy {guestHomeSimulation.buggyShown ? '✓' : '✗'},{' '}
                      Requests {guestHomeSimulation.requestsInNav ? '✓' : '✗'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flags Table */}
            {selectedResortId && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search flags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Key</TableHead>
                          <TableHead className="text-xs text-center w-16">Global</TableHead>
                          <TableHead className="text-xs text-center w-20">Override</TableHead>
                          <TableHead className="text-xs text-center w-20">Effective</TableHead>
                          <TableHead className="text-xs">Parent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              {searchQuery ? 'No flags match your search' : 'No flags found'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRows.map((row) => (
                            <TableRow key={row.key} className="text-xs">
                              <TableCell className="py-2">
                                <div className="font-mono text-[10px] truncate max-w-[200px]" title={row.key}>
                                  {row.key}
                                </div>
                                <div className="text-muted-foreground truncate max-w-[200px]" title={row.label}>
                                  {row.label}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {row.globalValue === null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : row.globalValue ? (
                                  <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.resortOverride === null ? (
                                  <span className="text-muted-foreground text-[10px]">inherit</span>
                                ) : row.resortOverride ? (
                                  <Badge variant="default" className="text-[9px] px-1.5 bg-info text-info-foreground">ON</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[9px] px-1.5">OFF</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {row.effective ? (
                                  <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive mx-auto" />
                                )}
                              </TableCell>
                              <TableCell>
                                {row.parentKey ? (
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono text-[9px] text-muted-foreground truncate max-w-[80px]">
                                      {row.parentKey}
                                    </span>
                                    {row.parentEffective ? (
                                      <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!selectedResortId && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium">Select a Resort</p>
                <p className="text-sm text-muted-foreground">
                  Choose a resort above to see flag diagnostics
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
