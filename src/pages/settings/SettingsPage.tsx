import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, Anchor, ChevronRight, UsersRound, Shield, Bug, HeartPulse, FileSpreadsheet, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';

export default function SettingsPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManageResortStaff = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  const settingsSections = [
    {
      title: 'Guest Portal Links',
      description: 'Share QR codes and links for guests to access the portal',
      icon: LinkIcon,
      href: '/staff/settings/public-links',
      visible: canManageResortStaff,
    },
    {
      title: 'Resort Staff',
      description: 'Manage staff members and their roles for this resort',
      icon: UsersRound,
      href: '/staff/settings/resort-staff',
      visible: canManageResortStaff,
    },
    {
      title: 'Guest Import',
      description: 'Import guests from CSV files',
      icon: FileSpreadsheet,
      href: '/staff/settings/import/guests',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
    },
    {
      title: 'Resorts',
      description: 'Manage resort properties and configurations',
      icon: Building2,
      href: '/staff/settings/resorts',
      visible: isSuperAdmin(),
    },
    {
      title: 'Resources',
      description: 'Manage boats, vans, and other operational resources',
      icon: Anchor,
      href: '/staff/settings/resources',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
    },
    {
      title: 'Platform Users',
      description: 'Manage global roles for all platform users',
      icon: Shield,
      href: '/staff/settings/users',
      visible: isSuperAdmin(),
    },
    {
      title: 'Booking Health',
      description: 'Check for capacity issues and data inconsistencies',
      icon: HeartPulse,
      href: '/staff/settings/booking-health',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
    },
    {
      title: 'Permissions Debug',
      description: 'View your current permissions and access levels',
      icon: Bug,
      href: '/staff/settings/permissions',
      visible: isSuperAdmin(),
    },
  ];

  const visibleSections = settingsSections.filter(s => s.visible);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your resort operations</p>
      </div>

      {visibleSections.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No settings available for your current role.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleSections.map((section) => (
            <Card key={section.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link to={section.href}>
                  <Button variant="outline" className="w-full">
                    Manage {section.title}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
