import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Utensils, UserCheck, Globe, ArrowRight } from 'lucide-react';

const reportLinks = [
  {
    title: 'Activities Report',
    description: 'Activity booking statistics, revenue, and occupancy rates',
    icon: Activity,
    href: '/reports/activities',
  },
  {
    title: 'Restaurants Report',
    description: 'Restaurant covers by meal period and no-show rates',
    icon: Utensils,
    href: '/reports/restaurants',
  },
  {
    title: 'Guest Behaviour',
    description: 'Guest engagement and activity participation analysis',
    icon: UserCheck,
    href: '/reports/guest-behaviour',
  },
  {
    title: 'Market Report',
    description: 'Booking analysis by guest nationality',
    icon: Globe,
    href: '/reports/market',
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
