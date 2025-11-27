import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, Anchor, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { hasRole } = useAuth();

  const settingsSections = [
    {
      title: 'Resorts',
      description: 'Manage resort properties and configurations',
      icon: Building2,
      href: '/settings/resorts',
      adminOnly: true,
    },
    {
      title: 'Resources',
      description: 'Manage boats, vans, and other operational resources',
      icon: Anchor,
      href: '/settings/resources',
      adminOnly: false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your resort operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => {
          if (section.adminOnly && !hasRole('ADMIN')) {
            return null;
          }
          
          return (
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
          );
        })}
      </div>
    </div>
  );
}
