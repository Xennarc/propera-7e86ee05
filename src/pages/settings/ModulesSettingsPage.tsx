import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { useResortSettings, useUpdateResortSetting } from '@/hooks/useResortSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Car, Settings2, Info } from 'lucide-react';

interface ModuleConfig {
  key: 'transport_enabled';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const modules: ModuleConfig[] = [
  {
    key: 'transport_enabled',
    title: 'Transport (Buggy Requests)',
    description: 'Enable pooled buggy requests + dispatch console for this resort. Guests can request rides and staff can manage trips.',
    icon: Car,
  },
];

export default function ModulesSettingsPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;

  const currentResortRole = resortId ? getResortRole(resortId) : null;
  const canManageModules = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  const { data: settings, isLoading: settingsLoading } = useResortSettings(resortId);
  const updateSetting = useUpdateResortSetting();

  // Optimistic state for pending toggles
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  const handleToggle = async (key: 'transport_enabled', newValue: boolean) => {
    if (!resortId || !canManageModules) return;

    const oldValue = settings?.[key] ?? false;

    // Optimistic update
    setPendingToggles(prev => ({ ...prev, [key]: true }));

    try {
      await updateSetting.mutateAsync({
        resortId,
        key,
        value: newValue,
        oldValue,
      });
      toast.success(`Module ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Failed to update module setting:', error);
      toast.error('Failed to update module setting');
    } finally {
      setPendingToggles(prev => ({ ...prev, [key]: false }));
    }
  };

  const getModuleValue = (key: 'transport_enabled'): boolean => {
    return settings?.[key] ?? false;
  };

  if (!currentResort) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Select a resort to manage modules
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Enable or disable Propera modules for {currentResort.name}
          </p>
        </div>
      </div>

      <Separator />

      {/* Module Cards */}
      <div className="grid gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          const isEnabled = getModuleValue(module.key);
          const isPending = pendingToggles[module.key];

          return (
            <Card key={module.key} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      isEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {module.title}
                        {module.comingSoon && (
                          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm mt-0.5">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {settingsLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={isEnabled ? 'default' : 'secondary'}
                            className={`text-xs transition-colors ${isEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : ''}`}
                          >
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggle(module.key, checked)}
                            disabled={!canManageModules || isPending || module.comingSoon}
                            aria-label={`Toggle ${module.title}`}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Permission notice */}
              {!canManageModules && (
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>Only Resort Admins can change module settings.</span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Help text */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">How modules work</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Enabling a module adds it to staff navigation and unlocks guest-facing features</li>
          <li>Disabling a module hides it from navigation but preserves all existing data</li>
          <li>Changes take effect immediately across all devices</li>
        </ul>
      </div>
    </div>
  );
}
