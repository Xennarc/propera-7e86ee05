import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, Anchor, ChevronRight, UsersRound, Shield, Bug, HeartPulse, FileSpreadsheet, Link as LinkIcon, Palette, Calculator, Phone, Plane, Sparkles, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { TierGate, TierBadge } from '@/components/tier/TierGate';
import { TierFeature } from '@/lib/tier-features';

interface SettingsSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  visible: boolean;
  feature?: TierFeature;
}

export default function SettingsPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManageResortStaff = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  const settingsSections: SettingsSection[] = [
    {
      title: 'Pre-Arrival Settings',
      description: 'Configure pre-arrival forms, verification, and guest onboarding',
      icon: Plane,
      href: '/staff/settings/prearrival',
      visible: canManageResortStaff,
      feature: 'pre_arrival_links',
    },
    {
      title: 'Guest Portal Branding',
      description: 'Customize your resort logo, colors, and guest login page',
      icon: Palette,
      href: '/staff/settings/branding',
      visible: canManageResortStaff,
      feature: 'guest_portal_branding',
    },
    {
      title: 'Guest Portal Links',
      description: 'Share QR codes and links for guests to access the portal',
      icon: LinkIcon,
      href: '/staff/settings/public-links',
      visible: canManageResortStaff,
      feature: 'pre_arrival_links',
    },
    {
      title: 'Pricing & Taxes',
      description: 'Configure service charges, taxes, and pricing display',
      icon: Calculator,
      href: '/staff/settings/pricing',
      visible: canManageResortStaff,
      feature: 'settings_pricing_charges',
    },
    {
      title: 'Resort Directory',
      description: 'Manage outlet phone numbers visible to guests',
      icon: Phone,
      href: '/staff/settings/directory',
      visible: canManageResortStaff,
    },
    {
      title: 'Guest Requests',
      description: 'Configure retention, visibility, departments, and catalog',
      icon: MessageSquare,
      href: '/staff/settings/requests',
      visible: canManageResortStaff,
    },
    {
      title: 'Resort Staff',
      description: 'Manage staff members and their roles for this resort',
      icon: UsersRound,
      href: '/staff/settings/resort-staff',
      visible: canManageResortStaff,
      feature: 'settings_staff_management',
    },
    {
      title: 'Subscription Tiers',
      description: 'Manage subscription plans and feature access',
      icon: Sparkles,
      href: '/staff/settings/subscriptions',
      visible: isSuperAdmin(),
    },
    {
      title: 'Guest Import',
      description: 'Import guests from CSV files',
      icon: FileSpreadsheet,
      href: '/staff/settings/import/guests',
      visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
      feature: 'guest_management_csv_import',
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
      feature: 'activities_resources',
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
      feature: 'settings_booking_health',
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

  const renderSection = (section: SettingsSection) => {
    const cardContent = (
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <section.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  {section.feature && <TierBadge feature={section.feature} />}
                </div>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            Manage {section.title}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );

    if (section.feature) {
      return (
        <TierGate key={section.title} feature={section.feature} fallback="disabled">
          <Link to={section.href} className="block h-full">
            {cardContent}
          </Link>
        </TierGate>
      );
    }

    return (
      <Link key={section.title} to={section.href} className="block h-full">
        {cardContent}
      </Link>
    );
  };

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
          {visibleSections.map(renderSection)}
        </div>
      )}
    </div>
  );
}
