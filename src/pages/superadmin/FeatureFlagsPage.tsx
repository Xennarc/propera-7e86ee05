import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResort } from '@/contexts/ResortContext';
import { toast } from 'sonner';
import {
  useFeatureFlags,
  useToggleFeatureFlag,
  useRemoveResortOverride,
  useBulkToggleFeatureFlags,
  useBulkResetResortOverrides,
  FEATURE_CATEGORIES,
} from '@/hooks/useFeatureFlags';
import { buildModuleViewModels, MODULES } from '@/lib/feature-flag-modules';
import { ModuleCard } from '@/components/superadmin/ModuleCard';
import {
  ToggleRight,
  Search,
  AlertTriangle,
  Zap,
  FlaskConical,
  Shield,
  Building2,
  Info,
  X,
  Layers,
  List,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { seedGlobalFeatureFlags } from '@/lib/seedFeatureFlags';
import type { FeatureFlag } from '@/hooks/useFeatureFlags';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  core: Building2,
  guest: ToggleRight,
  premium: Zap,
  experimental: FlaskConical,
  danger: AlertTriangle,
};

export default function FeatureFlagsPage() {
  const { resorts } = useResort();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('global');
  const [activeTab, setActiveTab] = useState<'modules' | 'categories'>('modules');
  const [confirmDialog, setConfirmDialog] = useState<{ 
    open: boolean; 
    flagKey: string | null; 
    flagLabel: string;
    newValue: boolean;
    isDangerous: boolean;
  }>({
    open: false,
    flagKey: null,
    flagLabel: '',
    newValue: false,
    isDangerous: false,
  });

  const isResortScope = selectedResort !== 'global';

  const { data: flags, isLoading, refetch } = useFeatureFlags(
    isResortScope ? selectedResort : undefined
  );
  const toggleFlag = useToggleFeatureFlag();
  const removeOverride = useRemoveResortOverride();
  const bulkToggle = useBulkToggleFeatureFlags();
  const bulkReset = useBulkResetResortOverrides();

  const isPending = toggleFlag.isPending || bulkToggle.isPending || bulkReset.isPending;

  // Seeding guard - runs once on mount
  const hasSeeded = useRef(false);

  useEffect(() => {
    if (hasSeeded.current) return;
    hasSeeded.current = true;

    const runSeeding = async () => {
      try {
        const result = await seedGlobalFeatureFlags(supabase);
        
        if (!result.success) {
          console.warn('[Feature Flags] Seeding had errors:', result.errors);
          toast.error('Some feature flags could not be seeded', {
            description: result.errors[0],
          });
        } else if (result.seededCount > 0) {
          console.log(`[Feature Flags] Seeded ${result.seededCount} new flags`);
          refetch();
        }
      } catch (error) {
        console.error('[Feature Flags] Seeding failed:', error);
        toast.error('Failed to initialize feature flags', {
          description: 'Please refresh the page to try again.',
        });
      }
    };

    runSeeding();
  }, [refetch]);

  // Build module view models
  const moduleViewModels = useMemo(() => {
    return buildModuleViewModels(flags || [], isResortScope);
  }, [flags, isResortScope]);

  // Filter flags for search and category view
  const filteredFlags = useMemo(() => {
    if (!flags) return [];
    if (!searchQuery) return flags;
    return flags.filter(flag => 
      flag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flag.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [flags, searchQuery]);

  // Group by category for legacy view
  const groupedFlags = useMemo(() => {
    return Object.entries(FEATURE_CATEGORIES).map(([key, config]) => ({
      key,
      ...config,
      flags: filteredFlags.filter(f => f.category === key),
    })).filter(g => g.flags.length > 0);
  }, [filteredFlags]);

  // Filter module view models by search
  const filteredModules = useMemo(() => {
    if (!searchQuery) return moduleViewModels;
    const query = searchQuery.toLowerCase();
    return moduleViewModels.filter(m => 
      m.definition.label.toLowerCase().includes(query) ||
      m.definition.description.toLowerCase().includes(query) ||
      m.childFlags.some(f => 
        f.label.toLowerCase().includes(query) || 
        f.description?.toLowerCase().includes(query)
      )
    );
  }, [moduleViewModels, searchQuery]);

  const handleToggle = (flag: FeatureFlag, newValue: boolean) => {
    if (flag.is_dangerous) {
      setConfirmDialog({ 
        open: true, 
        flagKey: flag.key, 
        flagLabel: flag.label,
        newValue, 
        isDangerous: true 
      });
    } else {
      applyToggle(flag.key, newValue);
    }
  };

  const applyToggle = async (flagKey: string, newValue: boolean) => {
    try {
      await toggleFlag.mutateAsync({
        flagKey,
        isEnabled: newValue,
        resortId: isResortScope ? selectedResort : undefined,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const confirmToggle = () => {
    if (confirmDialog.flagKey) {
      applyToggle(confirmDialog.flagKey, confirmDialog.newValue);
    }
    setConfirmDialog({ open: false, flagKey: null, flagLabel: '', newValue: false, isDangerous: false });
  };

  const handleRemoveOverride = async (flagKey: string) => {
    if (!isResortScope) return;
    try {
      await removeOverride.mutateAsync({
        flagKey,
        resortId: selectedResort,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  // Bulk action handlers for ModuleCard
  const handleBulkEnable = async (flagKeys: string[]) => {
    await bulkToggle.mutateAsync({
      flagKeys,
      isEnabled: true,
      resortId: isResortScope ? selectedResort : undefined,
    });
  };

  const handleBulkDisable = async (flagKeys: string[]) => {
    await bulkToggle.mutateAsync({
      flagKeys,
      isEnabled: false,
      resortId: isResortScope ? selectedResort : undefined,
    });
  };

  const handleResetOverrides = async (flagKeys: string[]) => {
    if (!isResortScope) return;
    await bulkReset.mutateAsync({
      flagKeys,
      resortId: selectedResort,
    });
  };

  // Stats for header
  const totalOverrides = useMemo(() => {
    if (!isResortScope || !flags) return 0;
    return flags.filter(f => f.resort_id !== null).length;
  }, [flags, isResortScope]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ToggleRight className="h-7 w-7 text-primary" />
            Feature Flags
          </h1>
          <p className="text-muted-foreground mt-1">
            Control features globally or per-resort
          </p>
        </div>
        {isResortScope && totalOverrides > 0 && (
          <Badge variant="outline" className="self-start md:self-center bg-info/10 text-info border-info/30">
            {totalOverrides} Active Override{totalOverrides !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Scope Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedResort} onValueChange={setSelectedResort}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Global (All Resorts)
                  </div>
                </SelectItem>
                <Separator className="my-1" />
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
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      {isResortScope && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-info/10 border border-info/30">
          <Info className="h-5 w-5 text-info mt-0.5" />
          <div>
            <p className="font-medium text-sm">Resort Override Mode</p>
            <p className="text-xs text-muted-foreground">
              Changes here will only affect {resorts.find(r => r.id === selectedResort)?.name}. 
              Flags inherit from global settings unless overridden.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
              <CardContent className="space-y-4">
                {[1, 2].map(j => <Skeleton key={j} className="h-20 w-full" />)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabbed Content */}
      {!isLoading && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'modules' | 'categories')}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="modules" className="gap-2">
              <Layers className="h-4 w-4" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <List className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Modules View */}
          <TabsContent value="modules" className="mt-6 space-y-4">
            {filteredModules.length > 0 ? (
              filteredModules.map(module => (
                <ModuleCard
                  key={module.definition.key}
                  module={module}
                  isResortScope={isResortScope}
                  onToggleMaster={(flagKey, newValue) => {
                    const flag = flags?.find(f => f.key === flagKey);
                    if (flag) handleToggle(flag, newValue);
                  }}
                  onToggleChild={(flag, newValue) => handleToggle(flag, newValue)}
                  onBulkEnable={handleBulkEnable}
                  onBulkDisable={handleBulkDisable}
                  onResetOverrides={handleResetOverrides}
                  isPending={isPending}
                />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="font-medium">No modules found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search' : 'Modules will appear here'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Categories View (Legacy) */}
          <TabsContent value="categories" className="mt-6 space-y-6">
            {groupedFlags.map(group => {
              const IconComponent = CATEGORY_ICONS[group.key] || ToggleRight;
              const isDanger = group.key === 'danger';
              
              return (
                <Card key={group.key} className={isDanger ? 'border-destructive/50' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 ${group.color}`}>
                      <IconComponent className="h-5 w-5" />
                      {group.label}
                    </CardTitle>
                    {isDanger && (
                      <CardDescription className="text-destructive">
                        These flags can significantly impact platform availability. Use with extreme caution.
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {group.flags.map(flag => {
                        const isOverridden = flag.resort_id !== null && isResortScope;
                        
                        return (
                          <div
                            key={flag.key}
                            className={`flex items-center justify-between p-4 rounded-xl border ${
                              isDanger ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border/50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{flag.label}</span>
                                {flag.tier && (
                                  <Badge variant="outline" className="text-[9px] capitalize">
                                    {flag.tier}
                                  </Badge>
                                )}
                                {isOverridden && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[9px] bg-info/10 text-info border-info/30 cursor-pointer"
                                    onClick={() => handleRemoveOverride(flag.key)}
                                  >
                                    Override
                                    <X className="h-2.5 w-2.5 ml-1" />
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                            </div>
                            <Switch
                              checked={flag.is_enabled}
                              onCheckedChange={(checked) => handleToggle(flag, checked)}
                              disabled={isPending}
                              className={isDanger ? 'data-[state=checked]:bg-destructive' : ''}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {groupedFlags.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ToggleRight className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="font-medium">No feature flags found</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search' : 'Feature flags will appear here'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, flagKey: null, flagLabel: '', newValue: false, isDangerous: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {confirmDialog.newValue ? 'Enable' : 'Disable'} Dangerous Feature
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to {confirmDialog.newValue ? 'enable' : 'disable'}{' '}
                <strong>{confirmDialog.flagLabel}</strong>.
              </p>
              <p className="text-destructive font-medium">
                This action may significantly impact platform availability. Are you sure?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, flagKey: null, flagLabel: '', newValue: false, isDangerous: false })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmToggle} disabled={isPending}>
              Yes, {confirmDialog.newValue ? 'Enable' : 'Disable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
