import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResort } from '@/contexts/ResortContext';
import { usePlatformErrors, useResolveError, TimeRange } from '@/hooks/usePlatformErrors';
import { format } from 'date-fns';
import {
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Building2,
  Eye,
  Filter,
  BarChart3,
  Activity,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export function ErrorExplorer() {
  const navigate = useNavigate();
  const { resorts } = useResort();
  const [resortFilter, setResortFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = usePlatformErrors(
    resortFilter === 'all' ? undefined : resortFilter,
    timeRange,
    resorts
  );

  const resolveError = useResolveError();

  const filteredErrors = data?.errors.filter(e => 
    searchQuery === '' || 
    e.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.error_message.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleResolve = async (errorId: string) => {
    try {
      await resolveError.mutateAsync(errorId);
      toast.success('Error marked as resolved');
    } catch {
      toast.error('Failed to resolve error');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Critical</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Error</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        <Select value={resortFilter} onValueChange={setResortFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Resort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resorts</SelectItem>
            {resorts.map(resort => (
              <SelectItem key={resort.id} value={resort.id}>{resort.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search errors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Errors</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{data?.metrics.totalErrors || 0}</p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Trend</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">{data?.metrics.trend || 0}%</p>
                    {(data?.metrics.trend || 0) < 0 ? (
                      <TrendingDown className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Top Failing Routes</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.metrics.topRoutes.slice(0, 3).map((route, i) => (
                  <div key={route.route} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground truncate">{route.route}</span>
                    <Badge variant="outline">{route.count}</Badge>
                  </div>
                ))}
                {(!data?.metrics.topRoutes || data.metrics.topRoutes.length === 0) && (
                  <p className="text-sm text-muted-foreground">No errors recorded</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Error Log
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredErrors.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredErrors.map(error => (
                  <div 
                    key={error.id}
                    className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(error.severity)}
                          <span className="font-mono text-sm">{error.route}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{error.error_message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(error.created_at), 'MMM d, HH:mm')}
                          {error.resort_name && (
                            <>
                              <span>•</span>
                              <Building2 className="h-3 w-3" />
                              {error.resort_name}
                            </>
                          )}
                          {error.user_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{error.user_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResolve(error.id)}
                          disabled={resolveError.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/audit')}>
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/support')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium">No errors found</p>
              <p className="text-sm text-muted-foreground">No errors match your current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correlation Helper */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Correlation Helpers</CardTitle>
          <CardDescription>Find related changes and affected resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-1" onClick={() => navigate('/superadmin/audit')}>
              <span className="font-medium text-sm">Show changes before spike</span>
              <span className="text-xs text-muted-foreground">View audit logs around error times</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-1">
              <span className="font-medium text-sm">Show affected resorts</span>
              <span className="text-xs text-muted-foreground">See which resorts are impacted</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-1" onClick={() => navigate('/superadmin/support')}>
              <span className="font-medium text-sm">Open Support Mode</span>
              <span className="text-xs text-muted-foreground">Debug in affected environment</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
