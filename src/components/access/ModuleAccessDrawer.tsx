import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, History, Copy, GitCompare, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  useUserRoles,
  useUserOverrides,
  useUserAccessAudit,
  useEffectivePermissions,
  useRolePermissions,
} from '@/hooks/useEffectivePermissions';
import { useModulePermissions, ModuleAccessState } from '@/hooks/useModulePermissions';
import { useRemovePermissionOverride } from '@/hooks/useAccessManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { AccessIdentityHeader } from './AccessIdentityHeader';
import { AccessModeSelector, AccessMode } from './AccessModeSelector';
import { ModuleAccessFilters, ModuleFilter } from './ModuleAccessFilters';
import { ModuleAccessList } from './ModuleAccessList';
import { ChangeImpactSummary, AccessChange } from './ChangeImpactSummary';
import { AccessDrawerFooter } from './AccessDrawerFooter';
import { AccessAuditTab } from './AccessAuditTab';
import { CloneAccessDialog } from './CloneAccessDialog';

interface ModuleAccessDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email?: string;
  } | null;
  resortId: string;
  readOnly?: boolean;
}

export function ModuleAccessDrawer({ open, onOpenChange, user, resortId, readOnly: readOnlyProp }: ModuleAccessDrawerProps) {
  const { isSuperAdmin } = useAuth();
  const { currentResort } = useResort();
  const superAdmin = isSuperAdmin();
  const queryClient = useQueryClient();

  const { hasPermission } = useEffectivePermissions();
  const canManagePerms = superAdmin || hasPermission('access.permissions.manage');
  const readOnly = readOnlyProp ?? !canManagePerms;

  // Data hooks for the target user
  const { data: userRoles = [], isLoading: rolesLoading } = useUserRoles(user?.id, resortId);
  const { data: userOverrides = [], isLoading: overridesLoading } = useUserOverrides(user?.id, resortId);
  const { data: auditLog = [], isLoading: auditLoading } = useUserAccessAudit(user?.id, resortId);

  // Compute override keys
  const overrideKeys = useMemo(() => userOverrides.map(o => o.permission_key), [userOverrides]);

  // Get role permissions for the target user's primary role
  const primaryRoleId = userRoles[0]?.role?.id ?? undefined;
  const { data: rolePermissions = [], isLoading: rolePermsLoading } = useRolePermissions(primaryRoleId);

  // Get effective permissions for the target user via RPC
  const { permissions: targetPermissions, isLoading: effectiveLoading } = useTargetEffectivePermissions(user?.id, resortId);

  const {
    groupedModules,
    modules: allModuleStates,
    uncategorizedKeys,
    isLoading: moduleLoading,
  } = useModulePermissions(targetPermissions, overrideKeys, rolePermissions);

  // UI state
  const [activeTab, setActiveTab] = useState('access');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ModuleFilter>('all');
  const [sessionChanges, setSessionChanges] = useState<AccessChange[]>([]);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const hasOverrides = userOverrides.length > 0;
  const [accessMode, setAccessMode] = useState<AccessMode>(hasOverrides ? 'customize' : 'role-defaults');

  const handleChangeRecorded = useCallback((moduleLabel: string, description: string, isSensitive: boolean) => {
    setSessionChanges(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, moduleLabel, description, isSensitive },
    ]);
    setShowResetSuccess(false);
  }, []);

  // Derive role name from first assigned role
  const primaryRole = userRoles[0]?.role?.name ?? null;

  // Count customized vs inherited modules
  const customizedCount = allModuleStates.filter(m => m.inheritance === 'customized').length;
  const inheritedCount = allModuleStates.filter(m => m.inheritance === 'inherited').length;

  // Last audit entry for "last changed" context
  const lastAuditEntry = auditLog[0] as any;
  const lastChangedAt = lastAuditEntry?.created_at ?? null;
  const lastChangedBy = lastAuditEntry?.actor?.full_name || lastAuditEntry?.actor?.username || null;

  // Reset all overrides
  const removeOverride = useRemovePermissionOverride();
  const handleResetToDefaults = useCallback(async () => {
    if (!user?.id || !resortId) return;
    setIsResetting(true);

    try {
      for (const override of userOverrides) {
        await supabase.rpc('remove_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['user-overrides', user.id, resortId] });
      queryClient.invalidateQueries({ queryKey: ['target-effective-permissions', user.id, resortId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', user.id, resortId] });

      setShowResetSuccess(true);
      setSessionChanges(prev => [
        ...prev,
        { id: `reset-${Date.now()}`, moduleLabel: 'All Modules', description: 'Reset to role defaults', isSensitive: false },
      ]);
      toast.success('Access reset to role defaults');
    } catch (err) {
      toast.error('Failed to reset overrides');
    } finally {
      setIsResetting(false);
    }
  }, [user?.id, resortId, userOverrides, queryClient]);

  // Clone overrides from another user
  const handleCloneAccess = useCallback(async (sourceUserId: string) => {
    if (!user?.id || !resortId) return;

    try {
      const { data: sourceOverrides, error } = await supabase
        .from('user_permission_overrides')
        .select('permission_key, effect')
        .eq('user_id', sourceUserId)
        .eq('resort_id', resortId);

      if (error) throw error;

      for (const override of userOverrides) {
        await supabase.rpc('remove_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
        });
      }

      for (const override of (sourceOverrides || [])) {
        await supabase.rpc('set_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
          p_effect: override.effect,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['user-overrides', user.id, resortId] });
      queryClient.invalidateQueries({ queryKey: ['target-effective-permissions', user.id, resortId] });
      queryClient.invalidateQueries({ queryKey: ['user-access-audit', user.id, resortId] });

      setSessionChanges(prev => [
        ...prev,
        { id: `clone-${Date.now()}`, moduleLabel: 'All Modules', description: `Cloned ${sourceOverrides?.length || 0} overrides from another user`, isSensitive: false },
      ]);
      setCloneDialogOpen(false);
      toast.success(`Cloned ${sourceOverrides?.length || 0} permission overrides`);
    } catch (err) {
      toast.error('Failed to clone access');
    }
  }, [user?.id, resortId, userOverrides, queryClient]);

  // Filter modules
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return groupedModules
      .map(g => ({
        ...g,
        modules: g.modules.filter(m => {
          if (q && !m.module.label.toLowerCase().includes(q) && !m.module.description.toLowerCase().includes(q)) {
            return false;
          }
          switch (filter) {
            case 'enabled': return m.access === 'full' || m.access === 'partial';
            case 'restricted': return m.access === 'none';
            case 'customized': return m.inheritance === 'customized';
            case 'sensitive': return m.module.isSensitive;
            default: return true;
          }
        }),
      }))
      .filter(g => g.modules.length > 0);
  }, [groupedModules, search, filter]);

  const isLoading = rolesLoading || overridesLoading || effectiveLoading || moduleLoading || rolePermsLoading;

  // Log uncategorized permissions for cleanup
  if (uncategorizedKeys.length > 0) {
    console.warn('[ModuleAccessDrawer] Uncategorized permission keys (not mapped to any module):', uncategorizedKeys);
  }

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        <div className="px-5 pt-5 pb-0 space-y-0">
          <SheetHeader className="pb-3">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4.5 w-4.5" />
              Access Management
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-3 pb-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <AccessIdentityHeader
                user={user}
                resortName={currentResort?.name ?? undefined}
                roleName={primaryRole ?? undefined}
                customizedCount={customizedCount}
                hasOverrides={hasOverrides}
                totalModules={allModuleStates.length}
                inheritedCount={inheritedCount}
                lastChangedAt={lastChangedAt}
                lastChangedBy={lastChangedBy}
              />

              {/* Access mode selector */}
              {!readOnly && (
                <div className="py-3 border-b border-border/30">
                  <AccessModeSelector
                    mode={accessMode}
                    onChange={setAccessMode}
                    disabled={readOnly}
                  />
                </div>
              )}

              {/* QoL action buttons */}
              {!readOnly && accessMode === 'customize' && (
                <div className="flex items-center gap-1.5 py-2.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-lg"
                    onClick={() => setCloneDialogOpen(true)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Clone from…
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 text-xs gap-1.5 rounded-lg ${showCompare ? 'bg-accent' : ''}`}
                    onClick={() => setShowCompare(!showCompare)}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{showCompare ? 'Hide' : 'Show'} comparison</span>
                    <span className="sm:hidden">Compare</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-5">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="access" className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Access
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Audit Log
                {auditLog.length > 0 && (
                  <Badge variant="subtle" className="text-[10px] px-1.5 py-0 tabular-nums ml-1">
                    {auditLog.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="access" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-5">
              <ModuleAccessFilters
                search={search}
                onSearchChange={setSearch}
                filter={filter}
                onFilterChange={setFilter}
              />
            </div>

            {/* Role comparison banner */}
            {showCompare && !isLoading && (
              <div className="mx-5 mb-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary mb-2">
                  Role Defaults Comparison
                </p>
                <div className="space-y-1">
                  {allModuleStates.filter(m => m.module.permissionKeys.length > 0).map(m => {
                    const roleGranted = rolePermissions.filter(rp => m.module.permissionKeys.includes(rp)).length;
                    const totalKeys = m.module.permissionKeys.length;
                    return (
                      <div key={m.module.id} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-muted-foreground truncate">{m.module.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {roleGranted}/{totalKeys}
                          </span>
                          {m.customizationState !== 'inherited' && (
                            <Badge
                              variant={
                                m.customizationState === 'elevated' ? 'info' :
                                m.customizationState === 'restricted' ? 'destructive' :
                                'warning'
                              }
                              className="text-[10px] px-1.5 py-0"
                            >
                              {m.customizationState}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-5 pb-3">
              {isLoading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="pt-1">
                  <ModuleAccessList
                    groups={filteredGroups}
                    readOnly={readOnly || accessMode === 'role-defaults'}
                    userId={user.id}
                    resortId={resortId}
                    rolePermissions={rolePermissions}
                    userOverrides={userOverrides}
                    onChangeRecorded={handleChangeRecorded}
                  />

                  {/* Uncategorized permissions warning */}
                  {uncategorizedKeys.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-xl border border-warning/30 bg-warning/5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                        <p className="text-xs font-medium text-warning">
                          Unmapped Permissions ({uncategorizedKeys.length})
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2.5">
                        These permissions exist but aren't assigned to a module yet. They remain active and unchanged.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {uncategorizedKeys.slice(0, 10).map(key => (
                          <span key={key} className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-md">
                            {key}
                          </span>
                        ))}
                        {uncategorizedKeys.length > 10 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{uncategorizedKeys.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {sessionChanges.length > 0 && (
              <ChangeImpactSummary changes={sessionChanges} />
            )}
          </TabsContent>

          <TabsContent value="audit" className="flex-1 min-h-0 mt-0">
            <AccessAuditTab
              auditLog={auditLog}
              isLoading={auditLoading}
              lastChangedAt={lastChangedAt}
              lastChangedBy={lastChangedBy}
            />
          </TabsContent>
        </Tabs>

        {/* Sticky footer */}
        <AccessDrawerFooter
          sessionChanges={sessionChanges}
          hasOverrides={hasOverrides}
          readOnly={readOnly}
          onClose={() => onOpenChange(false)}
          onResetToDefaults={handleResetToDefaults}
          isResetting={isResetting}
          showSuccess={showResetSuccess}
        />

        {/* Clone dialog */}
        <CloneAccessDialog
          open={cloneDialogOpen}
          onOpenChange={setCloneDialogOpen}
          targetUserId={user.id}
          targetUserName={user.full_name || user.username || 'this user'}
          resortId={resortId}
          onClone={handleCloneAccess}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Hook to fetch effective permissions for a *target* user (not the acting user).
 */
function useTargetEffectivePermissions(userId?: string, resortId?: string) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['target-effective-permissions', userId, resortId],
    queryFn: async () => {
      if (!userId || !resortId) return [];
      const { data, error } = await supabase
        .rpc('get_user_effective_permissions', { p_user_id: userId, p_resort_id: resortId });
      if (error) {
        console.error('Error fetching target permissions:', error);
        return [];
      }
      return (data || []).map((p: any) => p.permission_key as string);
    },
    enabled: !!userId && !!resortId,
    staleTime: 30000,
  });

  return { permissions: data, isLoading };
}
