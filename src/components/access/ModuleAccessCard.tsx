import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, Settings2, ShieldAlert, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleAccessState } from '@/hooks/useModulePermissions';
import { ModuleAccessLevel } from '@/config/permission-modules';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useSetPermissionOverride,
  useRemovePermissionOverride,
} from '@/hooks/useAccessManagement';
import { SensitivePermissionConfirmDialog } from './SensitivePermissionConfirmDialog';
import {
  Globe, Users, ClipboardList, MessageSquare, Award, Bell,
  Activity, UtensilsCrossed, Bus, Brush, BarChart3,
  ShieldCheck, Settings, CreditCard, Plug, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Users, ClipboardList, MessageSquare, Award, Bell,
  Activity, UtensilsCrossed, Bus, Brush, BarChart3,
  ShieldCheck, Settings, CreditCard, Plug, ShieldAlert, AlertTriangle,
};

const ACCESS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  full: { label: 'Full', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  none: { label: 'None', variant: 'secondary' },
};

const CUSTOMIZATION_CONFIG: Record<string, { label: string; variant: 'subtle' | 'info' | 'destructive' | 'outline' }> = {
  inherited: { label: 'Inherited', variant: 'subtle' },
  customized: { label: 'Custom', variant: 'info' },
  restricted: { label: 'Restricted', variant: 'destructive' },
  elevated: { label: 'Elevated', variant: 'info' },
};

interface ModuleAccessCardProps {
  state: ModuleAccessState;
  readOnly?: boolean;
  userId?: string;
  resortId?: string;
  rolePermissions?: string[];
  userOverrides?: Array<{ permission_key: string; effect: string }>;
  onChangeRecorded?: (moduleLabel: string, description: string, isSensitive: boolean) => void;
}

export function ModuleAccessCard({
  state,
  readOnly,
  userId,
  resortId,
  rolePermissions = [],
  userOverrides = [],
  onChangeRecorded,
}: ModuleAccessCardProps) {
  const { module: mod, access, customizationState, overrideCount, effectiveLevel, canGrant } = state;
  const Icon = ICON_MAP[mod.icon] || Globe;
  const accessCfg = ACCESS_CONFIG[access];
  const customCfg = CUSTOMIZATION_CONFIG[customizationState];
  const isEmpty = mod.permissionKeys.length === 0;
  const isDisabled = readOnly || !canGrant || isEmpty;
  const isSensitive = mod.isSensitive;
  const isPlatformOnly = mod.isPlatformOnly;

  const [isOpen, setIsOpen] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [confirmLabel, setConfirmLabel] = useState('');
  const [confirmImpact, setConfirmImpact] = useState('');

  const setOverride = useSetPermissionOverride();
  const removeOverride = useRemovePermissionOverride();

  const overrideMap = new Map(userOverrides.map(o => [o.permission_key, o.effect]));
  const rolePermSet = new Set(rolePermissions);

  const recordChange = useCallback((desc: string) => {
    onChangeRecorded?.(mod.label, desc, isSensitive);
  }, [onChangeRecorded, mod.label, isSensitive]);

  const requireConfirmation = useCallback((label: string, impact: string, action: () => void) => {
    if (isSensitive) {
      setConfirmLabel(label);
      setConfirmImpact(impact);
      setPendingAction(() => action);
      setConfirmOpen(true);
    } else {
      action();
    }
  }, [isSensitive]);

  const handleConfirm = useCallback(() => {
    pendingAction?.();
    setPendingAction(null);
    setConfirmOpen(false);
  }, [pendingAction]);

  const executeTierChange = useCallback((tierId: string) => {
    if (!userId || !resortId || isDisabled) return;
    const level = mod.accessLevels.find(l => l.id === tierId);
    if (!level) return;

    const targetKeys = new Set(level.permissionKeys);

    for (const key of mod.permissionKeys) {
      const wantGranted = targetKeys.has(key);
      const roleHas = rolePermSet.has(key);

      if (wantGranted && roleHas) {
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      } else if (wantGranted && !roleHas) {
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'grant' });
      } else if (!wantGranted && roleHas) {
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'revoke' });
      } else {
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      }
    }
    recordChange(`Access changed to ${level.label}`);
  }, [userId, resortId, isDisabled, mod, rolePermSet, overrideMap, setOverride, removeOverride, recordChange]);

  const handleTierChange = useCallback((tierId: string) => {
    const level = mod.accessLevels.find(l => l.id === tierId);
    if (!level) return;

    requireConfirmation(
      `${mod.label} → ${level.label}`,
      mod.warningText || `This changes access level for ${mod.label} to "${level.label}". ${level.description}.`,
      () => executeTierChange(tierId),
    );
  }, [mod, requireConfirmation, executeTierChange]);

  const executePermissionToggle = useCallback((key: string, currentlyGranted: boolean) => {
    if (!userId || !resortId || isDisabled) return;

    const label = mod.permissionLabels[key] || key;
    if (currentlyGranted) {
      const roleHas = rolePermSet.has(key);
      if (roleHas) {
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'revoke' });
      } else {
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      }
      recordChange(`${label}: disabled`);
    } else {
      const roleHas = rolePermSet.has(key);
      if (roleHas) {
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      } else {
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'grant' });
      }
      recordChange(`${label}: enabled`);
    }
  }, [userId, resortId, isDisabled, rolePermSet, overrideMap, setOverride, removeOverride, mod.permissionLabels, recordChange]);

  const handlePermissionToggle = useCallback((key: string, currentlyGranted: boolean) => {
    const label = mod.permissionLabels[key] || key;
    requireConfirmation(
      currentlyGranted ? `Disable: ${label}` : `Enable: ${label}`,
      mod.warningText || `This will ${currentlyGranted ? 'revoke' : 'grant'} the "${label}" permission.`,
      () => executePermissionToggle(key, currentlyGranted),
    );
  }, [mod.permissionLabels, mod.warningText, requireConfirmation, executePermissionToggle]);

  // Compute granted keys
  const grantedKeys = new Set<string>();
  for (const key of mod.permissionKeys) {
    const override = overrideMap.get(key);
    if (override === 'grant') {
      grantedKeys.add(key);
    } else if (override === 'deny') {
      // explicitly denied
    } else if (rolePermSet.has(key)) {
      grantedKeys.add(key);
    }
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'rounded-lg border transition-colors',
            // Sensitive styling
            isSensitive && !isPlatformOnly && 'border-l-2 border-l-warning',
            isPlatformOnly && 'border-l-2 border-l-destructive',
            isSensitive && !isOpen && 'bg-warning/[0.02]',
            isPlatformOnly && !isOpen && 'bg-destructive/[0.02]',
            isOpen && 'border-border bg-card shadow-sm',
            !isOpen && !isSensitive && !isPlatformOnly && 'hover:bg-accent/30',
            !isOpen && isSensitive && !isPlatformOnly && 'hover:bg-warning/5',
            !isOpen && isPlatformOnly && 'hover:bg-destructive/5',
            isEmpty && 'opacity-50',
            !canGrant && !readOnly && 'opacity-60',
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              isPlatformOnly ? 'bg-destructive/10 text-destructive' :
              isSensitive ? 'bg-warning/10 text-warning' :
              access === 'full' ? 'bg-success/10 text-success' :
              access === 'partial' ? 'bg-warning/10 text-warning' :
              'bg-muted text-muted-foreground',
            )}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-tight truncate">{mod.label}</p>
                {isSensitive && (
                  <ShieldAlert className="h-3 w-3 text-warning shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug truncate">
                {effectiveLevel?.description ?? mod.description}
              </p>
              {/* Warning text for sensitive modules */}
              {isSensitive && mod.warningText && isOpen && (
                <p className="text-[10px] text-warning mt-0.5 leading-snug">
                  {mod.warningText}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Authority blocked message */}
              {!canGrant && !readOnly && !isEmpty ? (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>No authority</span>
                </div>
              ) : (
                <>
                  {/* Tier selector */}
                  {!isDisabled && mod.accessLevels.length > 1 ? (
                    <Select
                      value={effectiveLevel?.id ?? 'none'}
                      onValueChange={handleTierChange}
                      disabled={isDisabled}
                    >
                      <SelectTrigger className="h-7 w-[100px] text-[11px] px-2 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mod.accessLevels.map(level => (
                          <SelectItem key={level.id} value={level.id} className="text-xs">
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={accessCfg.variant} className="text-[10px] px-1.5 py-0">
                      {accessCfg.label}
                    </Badge>
                  )}

                  {/* Customization badge */}
                  <Badge variant={customCfg.variant} className="text-[10px] px-1.5 py-0">
                    {customCfg.label}
                  </Badge>

                  {/* Override count */}
                  {overrideCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
                      {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
                    </Badge>
                  )}
                </>
              )}

              {/* Expand chevron */}
              {!isEmpty && (
                <CollapsibleTrigger asChild>
                  <button
                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/50 transition-colors"
                    aria-label="Toggle advanced permissions"
                  >
                    {isOpen ? (
                      <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                  </button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Expanded advanced section */}
          <CollapsibleContent>
            <div className={cn(
              'border-t px-3 py-2 space-y-0.5',
              isSensitive && 'border-t-warning/20',
            )}>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Advanced Permissions
              </p>
              {mod.permissionKeys.map(key => {
                const label = mod.permissionLabels[key] || key;
                const isGranted = grantedKeys.has(key);
                const hasOverride = overrideMap.has(key);

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs truncate">{label}</span>
                      {hasOverride && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                          override
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={isGranted}
                      onCheckedChange={() => handlePermissionToggle(key, isGranted)}
                      disabled={isDisabled}
                      className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 data-[state=checked]:[&>span]:translate-x-4"
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Sensitive confirmation dialog */}
      <SensitivePermissionConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirm}
        changeLabel={confirmLabel}
        impactDescription={confirmImpact}
        isPlatformLevel={isPlatformOnly}
      />
    </>
  );
}
