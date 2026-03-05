import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Shield, History, Copy, GitCompare } from 'lucide-react';
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
  const lastAuditEntry = auditLog[0];
  const lastChangedAt = lastAuditEntry?.created_at ?? null;
  const lastChangedBy = lastAuditEntry?.actor?.full_name || lastAuditEntry?.actor?.username || null;

  // Reset all overrides
  const removeOverride = useRemovePermissionOverride();
  const handleResetToDefaults = useCallback(async () => {
    if (!user?.id || !resortId) return;
    setIsResetting(true);

    try {
      // Remove all overrides one by one (could optimize with a batch RPC later)
      for (const override of userOverrides) {
        await supabase.rpc('remove_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
        });
      }

      // Invalidate queries
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
      // Fetch source user's overrides
      const { data: sourceOverrides, error } = await supabase
        .from('user_permission_overrides')
        .select('permission_key, effect')
        .eq('user_id', sourceUserId)
        .eq('resort_id', resortId);

      if (error) throw error;

      // Remove existing overrides for target user
      for (const override of userOverrides) {
        await supabase.rpc('remove_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
        });
      }

      // Apply source overrides to target
      for (const override of (sourceOverrides || [])) {
        await supabase.rpc('set_permission_override', {
          p_user_id: user.id,
          p_resort_id: resortId,
          p_permission_key: override.permission_key,
          p_effect: override.effect,
        });
      }

      // Invalidate queries
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
        <div className="px-6 pt-6 pb-0 space-y-0">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4.5 w-4.5" />
              Access Management
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-3 pb-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
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

              {/* Quick actions bar */}
              {!readOnly && (
                <div className="flex items-center gap-2 py-2 border-b border-border/30">
                  <AccessModeSelector
                    mode={accessMode}
                    onChange={setAccessMode}
                    disabled={readOnly}
                  />
                </div>
              )}

              {/* QoL action buttons */}
              {!readOnly && accessMode === 'customize' && (
                <div className="flex items-center gap-1.5 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setCloneDialogOpen(true)}
                  >
                    <Copy className="h-3 w-3" />
                    Clone from…
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs gap-1.5 ${showCompare ? 'bg-accent' : ''}`}
                    onClick={() => setShowCompare(!showCompare)}
                  >
                    <GitCompare className="h-3 w-3" />
                    {showCompare ? 'Hide' : 'Show'} role comparison
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="access" className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Access
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Audit Log
                {auditLog.length > 0 && (
                  <span className="ml-1 text-[10px] tabular-nums text-muted-foreground">{auditLog.length}</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="access" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="px-6">
              <ModuleAccessFilters
                search={search}
                onSearchChange={setSearch}
                filter={filter}
                onFilterChange={setFilter}
              />
            </div>

            {/* Role comparison banner */}
            {showCompare && !isLoading && (
              <div className="mx-6 mb-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary mb-1.5">
                  Role Defaults Comparison
                </p>
                <div className="space-y-0.5">
                  {allModuleStates.filter(m => m.module.permissionKeys.length > 0).map(m => {
                    const roleGranted = rolePermissions.filter(rp => m.module.permissionKeys.includes(rp)).length;
                    const totalKeys = m.module.permissionKeys.length;
                    return (
                      <div key={m.module.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{m.module.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            Role: {roleGranted}/{totalKeys}
                          </span>
                          {m.customizationState !== 'inherited' && (
                            <span className={`text-[10px] font-medium ${
                              m.customizationState === 'elevated' ? 'text-info' :
                              m.customizationState === 'restricted' ? 'text-destructive' :
                              'text-warning'
                            }`}>
                              {m.customizationState}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 px-6 pb-2">
              {isLoading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <div className="pt-2">
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
                    <div className="mt-3 p-3 rounded-lg border border-warning/30 bg-warning/5">
                      <p className="text-xs font-medium text-warning mb-1">
                        Unmapped Permissions ({uncategorizedKeys.length})
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        These permissions exist but aren't assigned to a module yet. They remain active and unchanged.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {uncategorizedKeys.slice(0, 10).map(key => (
                          <span key={key} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
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
