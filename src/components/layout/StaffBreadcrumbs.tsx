import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbSegment {
  label: string;
  href: string;
}

const routeLabels: Record<string, string> = {
  'staff': 'Dashboard',
  'dashboard': 'Dashboard',
  'guests': 'Guests',
  'guest-requests': 'Guest Requests',
  'prearrival': 'Pre-Arrival',
  'today': "Today's Opportunities",
  'team': 'Team Directory',
  'activities': 'Activities',
  'sessions': 'Sessions',
  'cheatsheet': 'Cheat Sheet',
  'restaurants': 'Dining',
  'slots': 'Time Slots',
  'reports': 'Reports',
  'cancellations': 'Cancellations',
  'guest-behaviour': 'Guest Behaviour',
  'market': 'Market',
  'loyalty': 'Loyalty',
  'program': 'Program Settings',
  'tiers': 'Tiers',
  'settings': 'Settings',
  'resort-staff': 'Resort Staff',
  'branding': 'Branding',
  'directory': 'Directory',
  'resorts': 'Resorts',
  'subscriptions': 'Subscriptions',
  'access': 'Access Management',
  'superadmin': 'Super Admin',
};

export function StaffBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbSegment[] = [];

    let currentPath = '';
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;

      // Skip UUID segments (they're IDs, not navigable labels)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      if (isUUID) continue;

      // Get readable label
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      crumbs.push({
        label,
        href: currentPath,
      });
    }

    return crumbs;
  }, [location.pathname]);

  // Don't show breadcrumbs for root level pages
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[180px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]",
                  isFirst && "flex items-center gap-1"
                )}
              >
                {isFirst && <Home className="h-3.5 w-3.5" />}
                <span className={isFirst ? "hidden sm:inline" : ""}>{crumb.label}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
