import { useState } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, Eye, Building2, List, ShieldAlert } from 'lucide-react';
import { RetentionPolicySection } from '@/components/settings/requests/RetentionPolicySection';
import { DepartmentVisibilitySection } from '@/components/settings/requests/DepartmentVisibilitySection';
import { DepartmentsManagerSection } from '@/components/settings/requests/DepartmentsManagerSection';
import { RequestCatalogSection } from '@/components/settings/requests/RequestCatalogSection';

export default function RequestsSettingsPage() {
  const { currentResort } = useResort();
  const { isSuperAdmin, getResortRole } = useAuth();
  const [activeTab, setActiveTab] = useState('retention');

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canAccess = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  if (!canAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Guest Requests Settings" />
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Access Denied</h3>
                <p className="text-muted-foreground">
                  Only Resort Admins and Super Admins can access this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentResort) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Guest Requests Settings" />
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No resort selected
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Guest Requests Settings"
        description="Configure request handling, retention policies, departments, and catalog"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="retention" className="gap-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Retention</span>
          </TabsTrigger>
          <TabsTrigger value="visibility" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visibility</span>
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Departments</span>
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Catalog</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="retention" className="space-y-6">
          <RetentionPolicySection resortId={currentResort.id} />
        </TabsContent>

        <TabsContent value="visibility" className="space-y-6">
          <DepartmentVisibilitySection resortId={currentResort.id} />
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <DepartmentsManagerSection resortId={currentResort.id} />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <RequestCatalogSection resortId={currentResort.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
