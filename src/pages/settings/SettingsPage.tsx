import { useState, useMemo } from 'react';
import { Building2, Anchor, Shield, Bug, HeartPulse, FileSpreadsheet, Link as LinkIcon, Palette, Calculator, Phone, Plane, Sparkles, MessageSquare, Users, Settings2, Wrench, LayoutGrid, Car, Rocket, DollarSign, Database } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { TierFeature } from '@/lib/tier-features';
import { SettingsSection, SettingsCard } from '@/components/admin';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { Card, CardContent } from '@/components/ui/card';

interface SettingsItem {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  visible: boolean;
  feature?: TierFeature;
}

interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: 'admin' | 'super-admin';
  defaultOpen: boolean;
  items: SettingsItem[];
}

export default function SettingsPage() {
  const { isSuperAdmin, getResortRole } = useAuth();
  const { currentResort } = useResort();
  const [search, setSearch] = useState('');

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManageResortStaff = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  const settingsGroups: SettingsGroup[] = [
    {
      id: 'guest-experience',
      title: 'Guest Experience',
      description: 'Configure how guests interact with your resort',
      icon: Users,
      defaultOpen: true,
      items: [
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
      ],
    },
    {
      id: 'operations',
      title: 'Operations & Modules',
      description: 'Manage day-to-day operational settings',
      icon: Settings2,
      defaultOpen: true,
      items: [
        {
          title: 'Modules',
          description: 'Enable or disable Propera modules like Transport',
          icon: LayoutGrid,
          href: '/staff/settings/modules',
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
          title: 'Resort Directory',
          description: 'Manage outlet phone numbers visible to guests',
          icon: Phone,
          href: '/staff/settings/directory',
          visible: canManageResortStaff,
        },
        {
          title: 'Transport',
          description: 'Configure transport service, pooling, and driver settings',
          icon: Car,
          href: '/staff/transport/settings',
          visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
        },
      ],
    },
    {
      id: 'finance-resources',
      title: 'Finance & Resources',
      description: 'Pricing, assets, and booking diagnostics',
      icon: DollarSign,
      defaultOpen: false,
      items: [
        {
          title: 'Pricing & Taxes',
          description: 'Configure service charges, taxes, and pricing display',
          icon: Calculator,
          href: '/staff/settings/pricing',
          visible: canManageResortStaff,
          feature: 'settings_pricing_charges',
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
          title: 'Booking Health',
          description: 'Check for capacity issues and data inconsistencies',
          icon: HeartPulse,
          href: '/staff/settings/booking-health',
          visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
          feature: 'settings_booking_health',
        },
      ],
    },
    {
      id: 'staff-data',
      title: 'Staff & Data',
      description: 'Manage your team, imports, and rollout',
      icon: Database,
      badge: 'admin',
      defaultOpen: true,
      items: [
        {
          title: 'Access Control',
          description: 'Manage staff roles, permissions, and access levels',
          icon: Shield,
          href: '/staff/settings/access',
          visible: canManageResortStaff,
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
          title: 'Dept Rollout',
          description: 'Roll out department scope v2 and ops adapter per-resort',
          icon: Rocket,
          href: '/staff/settings/dept-rollout',
          visible: isSuperAdmin() || currentResortRole === 'RESORT_ADMIN',
        },
      ],
    },
    {
      id: 'system',
      title: 'System',
      description: 'Platform-wide configuration and diagnostics',
      icon: Wrench,
      badge: 'super-admin',
      defaultOpen: false,
      items: [
        {
          title: 'Resorts',
          description: 'Manage resort properties and configurations',
          icon: Building2,
          href: '/staff/settings/resorts',
          visible: isSuperAdmin(),
        },
        {
          title: 'Platform Users',
          description: 'Manage global roles for all platform users',
          icon: Shield,
          href: '/staff/settings/users',
          visible: isSuperAdmin(),
        },
        {
          title: 'Subscription Tiers',
          description: 'Manage subscription plans and feature access',
          icon: Sparkles,
          href: '/staff/settings/subscriptions',
          visible: isSuperAdmin(),
        },
        {
          title: 'Permissions Debug',
          description: 'View your current permissions and access levels',
          icon: Bug,
          href: '/staff/settings/permissions',
          visible: isSuperAdmin(),
        },
      ],
    },
  ];

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    return settingsGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!item.visible) return false;
          if (!isSearching) return true;
          return (
            item.title.toLowerCase().includes(searchLower) ||
            item.description.toLowerCase().includes(searchLower)
          );
        }),
      }))
      .filter(group => group.items.length > 0);
  }, [search, canManageResortStaff, currentResortRole]);

  const hasNoSettings = visibleGroups.length === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Configure your resort operations"
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search settings..."
        className="max-w-sm"
      />

      {hasNoSettings ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {isSearching
                ? 'No settings match your search.'
                : 'No settings available for your current role.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <SettingsSection
              key={group.id}
              title={group.title}
              description={group.description}
              icon={group.icon}
              badge={group.badge}
              itemCount={group.items.length}
              defaultOpen={isSearching ? true : group.defaultOpen}
            >
              {group.items.map((item) => (
                <SettingsCard
                  key={item.href}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  href={item.href}
                  feature={item.feature}
                />
              ))}
            </SettingsSection>
          ))}
        </div>
      )}
    </div>
  );
}
