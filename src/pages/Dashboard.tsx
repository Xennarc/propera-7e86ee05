import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Users, Calendar, Utensils, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { currentResort } = useResort();

  const stats = [
    {
      title: 'Active Guests',
      value: '—',
      description: 'Currently checked in',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: "Today's Activities",
      value: '—',
      description: 'Scheduled sessions',
      icon: Calendar,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Dining Reservations',
      value: '—',
      description: 'For today',
      icon: Utensils,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Occupancy Rate',
      value: '—',
      description: 'This week',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.full_name || 'Staff'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {currentResort ? (
            <>Managing <span className="font-medium text-foreground">{currentResort.name}</span></>
          ) : (
            'Select a resort to get started'
          )}
        </p>
        {roles.length > 0 && (
          <div className="flex gap-2 mt-3">
            {roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {role.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {!currentResort ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No resort selected. Please select a resort from the sidebar or create one in Settings → Resorts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest bookings and check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  No recent activity
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Sessions</CardTitle>
                <CardDescription>Activities starting soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  No upcoming sessions
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
