import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Key, 
  History, 
  Plus, 
  Minus, 
  AlertTriangle,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  useRoles, 
  useUserRoles, 
  useUserOverrides, 
  usePermissionsCatalog,
  useUserAccessAudit,
  useRolePermissions,
  useEffectivePermissions
} from '@/hooks/useEffectivePermissions';
import { 
  useAssignRole, 
  useRemoveRole, 
  useSetPermissionOverride, 
  useRemovePermissionOverride 
} from '@/hooks/useAccessManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Permission, PERMISSION_CATEGORIES, AUDIT_ACTION_LABELS } from '@/types/rbac';
import { getVisibleModules } from '@/config/permission-modules';
import { cn } from '@/lib/utils';

interface UserAccessDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email?: string;
  } | null;
  resortId: string;
  /** When true the drawer is view-only — no toggle buttons rendered */
  readOnly?: boolean;
}

export function UserAccessDrawer({ open, onOpenChange, user, resortId, readOnly: readOnlyProp }: UserAccessDrawerProps) {
  const [activeTab, setActiveTab] = useState('roles');
  const { isSuperAdmin } = useAuth();
  const superAdmin = isSuperAdmin();

  // Determine effective read-only: explicit prop OR lacking permissions
  const { hasPermission } = useEffectivePermissions();
  const canManagePerms = superAdmin || hasPermission('access.permissions.manage');
  const readOnly = readOnlyProp ?? !canManagePerms;

  const { data: allRoles = [], isLoading: rolesLoading } = useRoles(resortId);
  const { data: userRoles = [], isLoading: userRolesLoading } = useUserRoles(user?.id, resortId);
  const { data: userOverrides = [], isLoading: overridesLoading } = useUserOverrides(user?.id, resortId);
  const { data: permissions = [], isLoading: permsLoading } = usePermissionsCatalog();
  const { data: auditLog = [], isLoading: auditLoading } = useUserAccessAudit(user?.id, resortId);

  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const setOverride = useSetPermissionOverride();
  const removeOverride = useRemovePermissionOverride();

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  }, [permissions]);

  // Get all permissions from assigned roles
  const rolePermissionKeys = useMemo(() => {
    const keys = new Set<string>();
    userRoles.forEach(ur => {
      // We'd need to fetch role permissions for each role
      // For now, we'll mark this as inherited
    });
    return keys;
  }, [userRoles]);

  // Build override map for quick lookup
  const overrideMap = useMemo(() => {
    const map: Record<string, 'grant' | 'revoke'> = {};
    userOverrides.forEach(o => {
      map[o.permission_key] = o.effect;
    });
    return map;
  }, [userOverrides]);

  const handleRoleToggle = async (roleId: string, isAssigned: boolean) => {
    if (!user?.id) return;
    
    if (isAssigned) {
      await removeRole.mutateAsync({ userId: user.id, resortId, roleId });
    } else {
      await assignRole.mutateAsync({ userId: user.id, resortId, roleId });
    }
  };

  const handlePermissionOverride = async (permissionKey: string, currentState: 'none' | 'grant' | 'revoke') => {
    if (!user?.id) return;

    // Cycle through: none -> grant -> revoke -> none
    if (currentState === 'none') {
      await setOverride.mutateAsync({ userId: user.id, resortId, permissionKey, effect: 'grant' });
    } else if (currentState === 'grant') {
      await setOverride.mutateAsync({ userId: user.id, resortId, permissionKey, effect: 'revoke' });
    } else {
      await removeOverride.mutateAsync({ userId: user.id, resortId, permissionKey });
    }
  };

  if (!user) return null;

  const isLoading = rolesLoading || userRolesLoading || overridesLoading || permsLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Management
          </SheetTitle>
          <SheetDescription>
            {user.full_name || user.username || user.email}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1">
              <Key className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="mt-4">
            {rolesLoading || userRolesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-4">
                  {allRoles.map(role => {
                    const isAssigned = userRoles.some(ur => ur.role_id === role.id);
                    const isPending = assignRole.isPending || removeRole.isPending;
                    
                    return (
                      <div
                        key={role.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          isAssigned ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{role.name}</span>
                            {role.is_system_role && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {role.description}
                            </p>
                          )}
                        </div>
                        {readOnly ? (
                          <Badge variant={isAssigned ? "default" : "secondary"}>
                            {isAssigned ? 'Assigned' : 'Not Assigned'}
                          </Badge>
                        ) : (
                          <Button
                            variant={isAssigned ? "destructive" : "default"}
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRoleToggle(role.id, isAssigned)}
                          >
                            {isAssigned ? (
                              <>
                                <Minus className="h-4 w-4 mr-1" />
                                Remove
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Assign
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-4">
            {permsLoading || overridesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-6 pr-4">
                  {PERMISSION_CATEGORIES.map(category => {
                    const categoryPerms = permissionsByCategory[category];
                    if (!categoryPerms?.length) return null;

                    const isDangerZone = category === 'Danger Zone';

                    return (
                      <div key={category}>
                        <h3 className={cn(
                          "text-sm font-semibold mb-2 flex items-center gap-2",
                          isDangerZone && "text-destructive"
                        )}>
                          {isDangerZone && <AlertTriangle className="h-4 w-4" />}
                          {category}
                        </h3>
                        <div className="space-y-1">
                          {categoryPerms.map(perm => {
                            const override = overrideMap[perm.key];
                            const state: 'none' | 'grant' | 'revoke' = override || 'none';
                            const isPending = setOverride.isPending || removeOverride.isPending;

                            // Don't allow non-super-admins to modify super admin permission
                            const isRestricted = perm.key === 'access.users.assign_superadmin' && !superAdmin;

                            return (
                              <div
                                key={perm.id}
                                className={cn(
                                  "flex items-center justify-between py-2 px-3 rounded-md",
                                  state === 'grant' && "bg-green-500/10",
                                  state === 'revoke' && "bg-red-500/10",
                                  perm.is_dangerous && "border border-destructive/20"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{perm.label}</span>
                                    {perm.is_dangerous && (
                                      <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                    )}
                                  </div>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                  {state === 'none' && (
                                    <Badge variant="secondary" className="text-xs">Inherited</Badge>
                                  )}
                                  {state === 'grant' && (
                                    <Badge className="bg-green-500 text-xs">Granted</Badge>
                                  )}
                                  {state === 'revoke' && (
                                    <Badge variant="destructive" className="text-xs">Revoked</Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={isPending || isRestricted}
                                    onClick={() => handlePermissionOverride(perm.key, state)}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="mt-4">
            {auditLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : auditLog.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No access changes recorded yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-4">
                  {auditLog.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {AUDIT_ACTION_LABELS[log.action_key] || log.action_key}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {log.details_json && Object.keys(log.details_json).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {log.details_json.role_name && (
                            <span>Role: {log.details_json.role_name}</span>
                          )}
                          {log.details_json.permission_key && (
                            <span>Permission: {log.details_json.permission_key}</span>
                          )}
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
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
