import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { format, subDays, subHours } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Wifi,
  Database,
  Zap,
  RefreshCw,
  Download,
  Building2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import OutboxMonitor from '@/components/superadmin/OutboxMonitor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

// Health status types
type HealthStatus = 'healthy' | 'degraded' | 'critical';

interface HealthCheck {
  name: string;
  status: HealthStatus;
  latency?: number;
  lastChecked: Date;
  details?: string;
}

interface ResortDiagnostic {
  resortId: string;
  resortName: string;
  issues: {
    type: 'error' | 'warning' | 'info';
    message: string;
    details?: string;
  }[];
}

export default function HealthMonitoringPage() {
  const { resorts } = useResort();
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const today = new Date().toISOString().split('T')[0];

  // Simulated system health checks
  const systemHealth: HealthCheck[] = [
    { name: 'Database', status: 'healthy', latency: 12, lastChecked: new Date() },
    { name: 'Auth Service', status: 'healthy', latency: 45, lastChecked: new Date() },
    { name: 'Edge Functions', status: 'healthy', latency: 89, lastChecked: new Date() },
    { name: 'Storage', status: 'healthy', latency: 34, lastChecked: new Date() },
    { name: 'Realtime', status: 'healthy', latency: 23, lastChecked: new Date() },
  ];

  // Fetch error metrics (simulated - would use actual error logging in production)
  const { data: errorMetrics, isLoading: loadingErrors } = useQuery({
    queryKey: ['health-error-metrics'],
    queryFn: async () => {
      // In production, this would query an error logging table
      return {
        last24h: 3,
        last7d: 12,
        trend: -25, // % change
        topErrors: [
          { route: '/guest/activities', count: 2, message: 'Session not found' },
          { route: '/staff/bookings', count: 1, message: 'Timeout error' },
        ],
      };
    },
  });

  // Fetch resort diagnostics
  const { data: diagnostics, isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['health-diagnostics', selectedResort],
    queryFn: async () => {
      const targetResorts = selectedResort === 'all' 
        ? resorts.filter(r => r.status === 'ACTIVE')
        : resorts.filter(r => r.id === selectedResort);

      const results: ResortDiagnostic[] = [];

      for (const resort of targetResorts) {
        const issues: ResortDiagnostic['issues'] = [];

        // Check for activities without sessions
        const { count: activityCount } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .eq('is_active', true);

        const { count: sessionCount } = await supabase
          .from('activity_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);

        if (activityCount && activityCount > 0 && (!sessionCount || sessionCount === 0)) {
          issues.push({
            type: 'warning',
            message: 'No upcoming activity sessions',
            details: `${activityCount} active activities but 0 sessions scheduled`,
          });
        }

        // Check for restaurants without slots
        const { count: restaurantCount } = await supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .eq('is_active', true);

        const { count: slotCount } = await supabase
          .from('restaurant_time_slots')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);

        if (restaurantCount && restaurantCount > 0 && (!slotCount || slotCount === 0)) {
          issues.push({
            type: 'warning',
            message: 'No upcoming dining slots',
            details: `${restaurantCount} active restaurants but 0 slots available`,
          });
        }

        // Check for guests without prearrival profiles
        const { count: upcomingGuests } = await supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gt('check_in_date', today);

        const { count: prearrivalCount } = await supabase
          .from('prearrival_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id);

        if (upcomingGuests && upcomingGuests > 10 && (!prearrivalCount || prearrivalCount < upcomingGuests * 0.5)) {
          issues.push({
            type: 'info',
            message: 'Low pre-arrival completion',
            details: `Only ${prearrivalCount || 0} of ${upcomingGuests} upcoming guests have pre-arrival profiles`,
          });
        }

        if (issues.length > 0 || selectedResort !== 'all') {
          results.push({
            resortId: resort.id,
            resortName: resort.name,
            issues,
          });
        }
      }

      return results;
    },
    enabled: resorts.length > 0,
  });

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return 'bg-success';
      case 'degraded': return 'bg-warning';
      case 'critical': return 'bg-destructive';
    }
  };

  const getStatusBadge = (status: HealthStatus) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-success/10 text-success border-success/30">Healthy</Badge>;
      case 'degraded': return <Badge className="bg-warning/10 text-warning border-warning/30">Degraded</Badge>;
      case 'critical': return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Critical</Badge>;
    }
  };

  const overallHealth: HealthStatus = systemHealth.every(h => h.status === 'healthy') 
    ? 'healthy' 
    : systemHealth.some(h => h.status === 'critical') 
      ? 'critical' 
      : 'degraded';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Health & Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            System health, errors, and resort diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className={overallHealth === 'healthy' ? 'border-success/50' : overallHealth === 'critical' ? 'border-destructive/50' : 'border-warning/50'}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              overallHealth === 'healthy' ? 'bg-success/10' : overallHealth === 'critical' ? 'bg-destructive/10' : 'bg-warning/10'
            }`}>
              {overallHealth === 'healthy' ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : (
                <AlertTriangle className={`h-8 w-8 ${overallHealth === 'critical' ? 'text-destructive' : 'text-warning'}`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {overallHealth === 'healthy' ? 'All Systems Operational' : overallHealth === 'critical' ? 'System Issues Detected' : 'Performance Degraded'}
              </h2>
              <p className="text-muted-foreground">
                Last checked: {format(new Date(), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <div className="ml-auto">
              {getStatusBadge(overallHealth)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Core infrastructure status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map(check => (
                <div key={check.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(check.status)}`} />
                    <span className="font-medium text-sm">{check.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {check.latency && (
                      <span className="text-xs text-muted-foreground">{check.latency}ms</span>
                    )}
                    {getStatusBadge(check.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Metrics
            </CardTitle>
            <CardDescription>Platform errors and trends</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingErrors ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-xl text-center">
                    <p className="text-3xl font-bold">{errorMetrics?.last24h || 0}</p>
                    <p className="text-xs text-muted-foreground">Errors (24h)</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-3xl font-bold">{errorMetrics?.last7d || 0}</p>
                      {errorMetrics?.trend && (
                        <span className={`text-sm ${errorMetrics.trend < 0 ? 'text-success' : 'text-destructive'}`}>
                          {errorMetrics.trend < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Errors (7d)</p>
                  </div>
                </div>

                {errorMetrics?.topErrors && errorMetrics.topErrors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Top Errors</p>
                    <div className="space-y-2">
                      {errorMetrics.topErrors.map((error, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-2 bg-destructive/5 rounded-lg">
                          <div>
                            <p className="font-medium">{error.route}</p>
                            <p className="text-xs text-muted-foreground">{error.message}</p>
                          </div>
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            {error.count}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notification Outbox Monitor */}
      <OutboxMonitor />

      {/* Resort Diagnostics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Resort Diagnostics
              </CardTitle>
              <CardDescription>Configuration and data integrity checks</CardDescription>
            </div>
            <Select value={selectedResort} onValueChange={setSelectedResort}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select resort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resorts</SelectItem>
                {resorts.map(resort => (
                  <SelectItem key={resort.id} value={resort.id}>{resort.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingDiagnostics ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : diagnostics && diagnostics.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {diagnostics.map(resort => (
                  <div key={resort.resortId} className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{resort.resortName}</h4>
                      {resort.issues.length === 0 ? (
                        <Badge className="bg-success/10 text-success border-success/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Healthy
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border-warning/30">
                          {resort.issues.length} issues
                        </Badge>
                      )}
                    </div>
                    {resort.issues.length > 0 && (
                      <div className="space-y-2">
                        {resort.issues.map((issue, i) => (
                          <div 
                            key={i} 
                            className={`p-3 rounded-lg text-sm ${
                              issue.type === 'error' ? 'bg-destructive/10 border border-destructive/20' :
                              issue.type === 'warning' ? 'bg-warning/10 border border-warning/20' :
                              'bg-info/10 border border-info/20'
                            }`}
                          >
                            <p className="font-medium">{issue.message}</p>
                            {issue.details && (
                              <p className="text-xs text-muted-foreground mt-1">{issue.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
              <p className="font-medium">All Clear</p>
              <p className="text-sm text-muted-foreground">No diagnostic issues found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
