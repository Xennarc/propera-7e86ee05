/**
 * ModuleCard Component
 * 
 * Displays a module with its master toggle, subfeature summary, and bulk actions.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ToggleLeft, 
  ToggleRight, 
  RotateCcw,
  Check,
  X,
  LayoutDashboard,
  Users,
  ClipboardList,
  Car,
  Plane,
  BarChart3,
  Crown,
  Globe,
  Zap,
} from 'lucide-react';
import type { ModuleViewModel } from '@/lib/feature-flag-modules';
import type { FeatureFlag } from '@/hooks/useFeatureFlags';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  ClipboardList,
  Car,
  Plane,
  BarChart3,
  Crown,
  Globe,
};

interface ModuleCardProps {
  module: ModuleViewModel;
  isResortScope: boolean;
  onToggleMaster: (flagKey: string, newValue: boolean) => void;
  onToggleChild: (flag: FeatureFlag, newValue: boolean) => void;
  onBulkEnable: (flagKeys: string[]) => void;
  onBulkDisable: (flagKeys: string[]) => void;
  onResetOverrides: (flagKeys: string[]) => void;
  isPending: boolean;
}

export function ModuleCard({
  module,
  isResortScope,
  onToggleMaster,
  onToggleChild,
  onBulkEnable,
  onBulkDisable,
  onResetOverrides,
  isPending,
}: ModuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean;
    action: 'enable_all' | 'disable_all' | 'reset_overrides';
    flagKeys: string[];
  }>({
    open: false,
    action: 'enable_all',
    flagKeys: [],
  });

  const { definition, masterFlag, childFlags, enabledChildCount, totalChildCount, hasOverrides, overrideCount } = module;
  const Icon = MODULE_ICONS[definition.icon] || Zap;

  if (!masterFlag) return null;

  const isMasterEnabled = masterFlag.is_enabled;
  const allChildFlagKeys = childFlags.map(f => f.key);

  const handleBulkAction = (action: 'enable_all' | 'disable_all' | 'reset_overrides') => {
    setConfirmAction({
      open: true,
      action,
      flagKeys: allChildFlagKeys,
    });
  };

  const confirmBulkAction = () => {
    switch (confirmAction.action) {
      case 'enable_all':
        onBulkEnable(confirmAction.flagKeys);
        break;
      case 'disable_all':
        onBulkDisable(confirmAction.flagKeys);
        break;
      case 'reset_overrides':
        onResetOverrides([masterFlag.key, ...confirmAction.flagKeys]);
        break;
    }
    setConfirmAction({ open: false, action: 'enable_all', flagKeys: [] });
  };

  const getActionDescription = () => {
    switch (confirmAction.action) {
      case 'enable_all':
        return `Enable all ${confirmAction.flagKeys.length} subfeatures in ${definition.label}?`;
      case 'disable_all':
        return `Disable all ${confirmAction.flagKeys.length} subfeatures in ${definition.label}?`;
      case 'reset_overrides':
        return `Reset all resort overrides for ${definition.label}? This will revert to global settings.`;
    }
  };

  return (
    <>
      <Card className={cn(
        "transition-all duration-200",
        !isMasterEnabled && "opacity-70"
      )}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              {/* Module Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isMasterEnabled 
                    ? "bg-primary/15 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{definition.label}</h3>
                    {hasOverrides && isResortScope && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] bg-info/10 text-info border-info/30"
                      >
                        {overrideCount} Override{overrideCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {definition.description}
                  </p>
                </div>
              </div>

              {/* Master Toggle + Stats */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Subfeature count */}
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-sm font-medium",
                      enabledChildCount === totalChildCount 
                        ? "text-success" 
                        : enabledChildCount === 0 
                          ? "text-muted-foreground" 
                          : "text-warning"
                    )}>
                      {enabledChildCount}/{totalChildCount}
                    </span>
                    <span className="text-xs text-muted-foreground">enabled</span>
                  </div>
                </div>

                {/* Master toggle */}
                <Switch
                  checked={isMasterEnabled}
                  onCheckedChange={(checked) => onToggleMaster(masterFlag.key, checked)}
                  disabled={isPending}
                />

                {/* Expand toggle */}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Bulk Actions */}
              <div className="flex flex-wrap items-center gap-2 py-2 border-t border-b border-border/50">
                <span className="text-xs text-muted-foreground font-medium mr-2">
                  Bulk Actions:
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleBulkAction('enable_all')}
                  disabled={isPending || enabledChildCount === totalChildCount}
                >
                  <ToggleRight className="h-3.5 w-3.5" />
                  Enable All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => handleBulkAction('disable_all')}
                  disabled={isPending || enabledChildCount === 0}
                >
                  <ToggleLeft className="h-3.5 w-3.5" />
                  Disable All
                </Button>
                {isResortScope && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-info border-info/30 hover:bg-info/10"
                    onClick={() => handleBulkAction('reset_overrides')}
                    disabled={isPending || !hasOverrides}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Overrides
                  </Button>
                )}
              </div>

              {/* Child Flags */}
              {childFlags.length > 0 ? (
                <div className="space-y-2">
                  {childFlags.map(flag => {
                    const isOverridden = isResortScope && flag.resort_id !== null;
                    
                    return (
                      <div
                        key={flag.key}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          "bg-muted/20 border-border/40",
                          !isMasterEnabled && "opacity-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
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
                                className="text-[9px] bg-info/10 text-info border-info/30"
                              >
                                Override
                              </Badge>
                            )}
                          </div>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {flag.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={flag.is_enabled}
                          onCheckedChange={(checked) => onToggleChild(flag, checked)}
                          disabled={isPending || !isMasterEnabled}
                          className="ml-4"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No subfeatures configured for this module.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmAction.open} 
        onOpenChange={(open) => !open && setConfirmAction({ open: false, action: 'enable_all', flagKeys: [] })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Action</AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction} disabled={isPending}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
