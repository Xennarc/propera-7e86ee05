import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, Settings2 } from 'lucide-react';
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
import {
  Globe, Users, ClipboardList, MessageSquare, Award, Bell,
  Activity, UtensilsCrossed, Bus, Brush, BarChart3,
  ShieldCheck, Settings, CreditCard, Plug, ShieldAlert, AlertTriangle,
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
}

export function ModuleAccessCard({
  state,
  readOnly,
  userId,
  resortId,
  rolePermissions = [],
  userOverrides = [],
}: ModuleAccessCardProps) {
  const { module: mod, access, customizationState, overrideCount, effectiveLevel, canGrant } = state;
  const Icon = ICON_MAP[mod.icon] || Globe;
  const accessCfg = ACCESS_CONFIG[access];
  const customCfg = CUSTOMIZATION_CONFIG[customizationState];
  const isEmpty = mod.permissionKeys.length === 0;
  const isDisabled = readOnly || !canGrant || isEmpty;

  const [isOpen, setIsOpen] = useState(false);

  const setOverride = useSetPermissionOverride();
  const removeOverride = useRemovePermissionOverride();

  // Build override lookup
  const overrideMap = new Map(userOverrides.map(o => [o.permission_key, o.effect]));
  const rolePermSet = new Set(rolePermissions);

  const handleTierChange = useCallback((tierId: string) => {
    if (!userId || !resortId || isDisabled) return;

    const level = mod.accessLevels.find(l => l.id === tierId);
    if (!level) return;

    const targetKeys = new Set(level.permissionKeys);

    // For each module permission, decide: grant override, deny override, or remove override
    for (const key of mod.permissionKeys) {
      const wantGranted = targetKeys.has(key);
      const roleHas = rolePermSet.has(key);

      if (wantGranted && roleHas) {
        // Role already grants it — remove any deny override
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      } else if (wantGranted && !roleHas) {
        // Need to grant via override
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'grant' });
      } else if (!wantGranted && roleHas) {
        // Need to deny via override
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'deny' });
      } else {
        // !wantGranted && !roleHas — remove any grant override
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      }
    }
  }, [userId, resortId, isDisabled, mod, rolePermSet, overrideMap, setOverride, removeOverride]);

  const handlePermissionToggle = useCallback((key: string, currentlyGranted: boolean) => {
    if (!userId || !resortId || isDisabled) return;

    if (currentlyGranted) {
      // Remove or deny
      const roleHas = rolePermSet.has(key);
      if (roleHas) {
        // Must explicitly deny
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'deny' });
      } else {
        // Was granted via override, remove it
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      }
    } else {
      // Grant
      const roleHas = rolePermSet.has(key);
      if (roleHas) {
        // Was denied via override, remove override to restore
        if (overrideMap.has(key)) {
          removeOverride.mutate({ userId, resortId, permissionKey: key });
        }
      } else {
        // Must explicitly grant
        setOverride.mutate({ userId, resortId, permissionKey: key, effect: 'grant' });
      }
    }
  }, [userId, resortId, isDisabled, rolePermSet, overrideMap, setOverride, removeOverride]);

  // Compute which keys are currently granted (from effective permissions context)
  // We derive this from: rolePermissions + overrides
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-lg border transition-colors',
          isOpen && 'border-border bg-card shadow-sm',
          !isOpen && 'hover:bg-accent/30',
          isEmpty && 'opacity-50',
          !canGrant && !readOnly && 'opacity-60',
        )}
      >
        {/* Collapsed header */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            access === 'full' ? 'bg-success/10 text-success' :
            access === 'partial' ? 'bg-warning/10 text-warning' :
            'bg-muted text-muted-foreground',
          )}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{mod.label}</p>
            <p className="text-xs text-muted-foreground leading-snug truncate">
              {effectiveLevel?.description ?? mod.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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

            {/* Override count chip */}
            {overrideCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
                {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
              </Badge>
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
          <div className="border-t px-3 py-2 space-y-0.5">
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
  );
}
