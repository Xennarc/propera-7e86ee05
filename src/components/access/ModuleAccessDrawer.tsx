import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useUserRoles,
  useUserOverrides,
  useUserAccessAudit,
  useEffectivePermissions,
  useRolePermissions,
} from '@/hooks/useEffectivePermissions';
import { useModulePermissions, ModuleAccessState } from '@/hooks/useModulePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { AUDIT_ACTION_LABELS } from '@/types/rbac';
import { AccessIdentityHeader } from './AccessIdentityHeader';
import { AccessModeSelector, AccessMode } from './AccessModeSelector';
import { ModuleAccessFilters, ModuleFilter } from './ModuleAccessFilters';
import { ModuleAccessList } from './ModuleAccessList';

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
    isLoading: moduleLoading,
  } = useModulePermissions(targetPermissions, overrideKeys, rolePermissions);

  // UI state
  const [activeTab, setActiveTab] = useState('access');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ModuleFilter>('all');

  const hasOverrides = userOverrides.length > 0;
  const [accessMode, setAccessMode] = useState<AccessMode>(hasOverrides ? 'customize' : 'role-defaults');

  // Derive role name from first assigned role
  const primaryRole = userRoles[0]?.role?.name ?? null;

  // Count customized modules
  const customizedCount = allModuleStates.filter(m => m.inheritance === 'customized').length;

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
              />
              {!readOnly && (
                <AccessModeSelector
                  mode={accessMode}
                  onChange={setAccessMode}
                  disabled={readOnly}
                />
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
            <ScrollArea className="flex-1 px-6 pb-6">
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
                  />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="audit" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full px-6 pb-6">
              {auditLoading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : auditLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No access changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  {auditLog.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-lg border border-border/40 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {AUDIT_ACTION_LABELS[log.action_key] || log.action_key}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {log.details_json && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {log.details_json.role_name && <span>Role: {log.details_json.role_name}</span>}
                          {log.details_json.permission_key && <span>Permission: {log.details_json.permission_key}</span>}
                        </div>
                      )}
                      {log.actor && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          By: {log.actor.full_name || log.actor.username || 'Unknown'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
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
