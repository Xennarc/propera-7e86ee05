import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Utensils, UserCheck, Globe, ArrowRight, MessageSquareHeart, DollarSign } from 'lucide-react';
import { XCircle, Users } from 'lucide-react';
import { TierGate, TierBadge } from '@/components/tier/TierGate';
import { TierFeature } from '@/lib/tier-features';
import { FeatureGate } from '@/components/FeatureGate';

interface ReportLink {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  feature?: TierFeature;
}

const reportLinks: ReportLink[] = [
  {
    title: 'Sales Performance',
    description: 'Revenue metrics, attach rates, and sales analytics',
    icon: DollarSign,
    href: '/staff/reports/sales',
    feature: 'reports_sales_performance',
  },
  {
    title: 'Activities Report',
    description: 'Activity booking statistics, revenue, and occupancy rates',
    icon: Activity,
    href: '/staff/reports/activities',
    feature: 'reports_activities',
  },
  {
    title: 'Restaurants Report',
    description: 'Restaurant covers by meal period and no-show rates',
    icon: Utensils,
    href: '/staff/reports/restaurants',
    feature: 'reports_restaurants',
  },
  {
    title: 'Cancellations Report',
    description: 'Cross-module cancellation analysis and patterns',
    icon: XCircle,
    href: '/staff/reports/cancellations',
    feature: 'reports_cancellations',
  },
  {
    title: 'Guests Report',
    description: 'Guest mix, channels, and length of stay analysis',
    icon: Users,
    href: '/staff/reports/guests',
    feature: 'reports_guests',
  },
  {
    title: 'Guest Behaviour',
    description: 'Guest engagement and activity participation analysis',
    icon: UserCheck,
    href: '/staff/reports/guest-behaviour',
    feature: 'reports_guests',
  },
  {
    title: 'Market Report',
    description: 'Booking analysis by guest nationality',
    icon: Globe,
    href: '/staff/reports/market',
    feature: 'reports_guests',
  },
  {
    title: 'Stay Feedback',
    description: 'End-of-stay guest satisfaction and feedback',
    icon: MessageSquareHeart,
    href: '/staff/reports/stay-feedback',
    feature: 'reports_feedback',
  },
];

function ReportsContent() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Operational statistics and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportLinks.map((report) => {
          const cardContent = (
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {report.feature && <TierBadge feature={report.feature} />}
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <CardTitle className="mt-4">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          );

          if (report.feature) {
            return (
              <TierGate key={report.href} feature={report.feature} fallback="disabled">
                <Link to={report.href}>
                  {cardContent}
                </Link>
              </TierGate>
            );
          }

          return (
            <Link key={report.href} to={report.href}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <FeatureGate requiredFlags={['enable_reports']} mode="staff">
      <ReportsContent />
    </FeatureGate>
  );
}
