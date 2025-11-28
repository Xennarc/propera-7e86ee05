import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { usePermissions, hasAccess, hasWriteAccess } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Shield, Check, X, Minus, Building2, User, Key } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
  RESORT_ADMIN: 'bg-primary/10 text-primary border-primary/20',
  MANAGER: 'bg-info/10 text-info border-info/20',
  FRONT_OFFICE: 'bg-success/10 text-success border-success/20',
  ACTIVITIES: 'bg-warning/10 text-warning border-warning/20',
  FNB: 'bg-accent/10 text-accent-foreground border-accent/20',
};

function AccessIcon({ access }: { access: 'full' | 'read' | 'none' | boolean }) {
  if (access === 'full' || access === true) {
    return <Check className="h-4 w-4 text-success" />;
  }
  if (access === 'read') {
    return <Minus className="h-4 w-4 text-warning" />;
  }
  return <X className="h-4 w-4 text-destructive" />;
}

function AccessBadge({ access }: { access: 'full' | 'read' | 'none' | boolean }) {
  if (access === 'full' || access === true) {
    return <Badge variant="confirmed" className="text-xs">Full Access</Badge>;
  }
  if (access === 'read') {
    return <Badge variant="pending" className="text-xs">Read Only</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">No Access</Badge>;
}

export default function PermissionsDebugPage() {
  const { user, profile, globalRole, memberships, isSuperAdmin } = useAuth();
  const { currentResort, resorts } = useResort();
  const permissions = usePermissions();

  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <EmptyState
          icon={Shield}
          title="Access Denied"
          description="Only Super Admins can view this debug page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Permissions Debug"
        description="View your current permissions and access levels"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium">{profile?.full_name || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Department</span>
                <span className="text-sm font-medium">{profile?.department || 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Global Role</span>
                <Badge variant="outline" className={ROLE_COLORS[globalRole]}>
                  {globalRole}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Resort */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Current Resort Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentResort ? (
              <div className="grid gap-2">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Resort</span>
                  <span className="text-sm font-medium">{currentResort.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Code</span>
                  <span className="text-sm font-mono">{currentResort.code}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Your Role</span>
                  <Badge variant="outline" className={ROLE_COLORS[permissions.currentResortRole || 'SUPER_ADMIN']}>
                    {permissions.currentResortRole || (permissions.isSuperAdmin ? 'SUPER_ADMIN' : 'None')}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No resort selected</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resort Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Resort Memberships
          </CardTitle>
          <CardDescription>
            {permissions.isSuperAdmin 
              ? `Super Admin access to all ${resorts.length} resorts`
              : `Access to ${memberships.length} resort(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.isSuperAdmin ? (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                As a Super Admin, you have full access to all resorts on the platform.
              </p>
            </div>
          ) : memberships.length === 0 ? (
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                You have no resort memberships. Contact a Super Admin to be added to a resort.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {memberships.map((membership) => (
                <div 
                  key={membership.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div>
                    <p className="font-medium text-sm">{membership.resort?.name || 'Unknown Resort'}</p>
                    <p className="text-xs text-muted-foreground">{membership.department || 'No department'}</p>
                  </div>
                  <Badge variant="outline" className={ROLE_COLORS[membership.resort_role]}>
                    {membership.resort_role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Module Access for Current Resort
          </CardTitle>
          <CardDescription>
            Your permissions based on your role in {currentResort?.name || 'the selected resort'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Guests</span>
              <AccessBadge access={permissions.canAccessGuests} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Activities</span>
              <AccessBadge access={permissions.canAccessActivities} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Restaurants</span>
              <AccessBadge access={permissions.canAccessRestaurants} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Reports</span>
              <AccessBadge access={permissions.canAccessReports} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Guest Requests</span>
              <AccessBadge access={permissions.canAccessGuestRequests} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <span className="text-sm font-medium">Settings</span>
              <AccessBadge access={permissions.canAccessSettings} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border/50">
            <h4 className="text-sm font-semibold mb-3">Administrative Actions</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <AccessIcon access={permissions.canManageResortStaff} />
                <span>Manage Resort Staff</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AccessIcon access={permissions.canManageResources} />
                <span>Manage Resources</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AccessIcon access={permissions.canManageResorts} />
                <span>Manage Resorts (Platform)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AccessIcon access={permissions.canManagePlatformUsers} />
                <span>Manage Platform Users</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
