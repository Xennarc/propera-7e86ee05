import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Utensils, UserCheck, Globe, ArrowRight, MessageSquareHeart, DollarSign } from 'lucide-react';

import { XCircle, Users } from 'lucide-react';

const reportLinks = [
  {
    title: 'Sales Performance',
    description: 'Revenue metrics, attach rates, and sales analytics',
    icon: DollarSign,
    href: '/staff/reports/sales',
  },
  {
    title: 'Activities Report',
    description: 'Activity booking statistics, revenue, and occupancy rates',
    icon: Activity,
    href: '/staff/reports/activities',
  },
  {
    title: 'Restaurants Report',
    description: 'Restaurant covers by meal period and no-show rates',
    icon: Utensils,
    href: '/staff/reports/restaurants',
  },
  {
    title: 'Cancellations Report',
    description: 'Cross-module cancellation analysis and patterns',
    icon: XCircle,
    href: '/staff/reports/cancellations',
  },
  {
    title: 'Guests Report',
    description: 'Guest mix, channels, and length of stay analysis',
    icon: Users,
    href: '/staff/reports/guests',
  },
  {
    title: 'Guest Behaviour',
    description: 'Guest engagement and activity participation analysis',
    icon: UserCheck,
    href: '/staff/reports/guest-behaviour',
  },
  {
    title: 'Market Report',
    description: 'Booking analysis by guest nationality',
    icon: Globe,
    href: '/staff/reports/market',
  },
  {
    title: 'Stay Feedback',
    description: 'End-of-stay guest satisfaction and feedback',
    icon: MessageSquareHeart,
    href: '/staff/reports/stay-feedback',
  },
];

export default function Reports() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Operational statistics and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportLinks.map((report) => (
          <Link key={report.href} to={report.href}>
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="mt-4">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
