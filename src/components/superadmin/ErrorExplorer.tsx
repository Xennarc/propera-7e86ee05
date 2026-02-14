import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useResort } from '@/contexts/ResortContext';
import { usePlatformErrors, useResolveError, TimeRange } from '@/hooks/usePlatformErrors';
import { useCreateIncident } from '@/hooks/useIncidents';
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
  FileWarning,
  Plus,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { ErrorGroupCard, groupErrors } from './ErrorGroupCard';

interface ErrorExplorerProps {
  onResortClick?: (resortId: string) => void;
}

export function ErrorExplorer({ onResortClick }: ErrorExplorerProps) {
  const navigate = useNavigate();
  const { resorts } = useResort();
  const [resortFilter, setResortFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByMessage, setGroupByMessage] = useState(true);
  const [affectedResortsDialogOpen, setAffectedResortsDialogOpen] = useState(false);
  const [createIncidentDialogOpen, setCreateIncidentDialogOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P1');

  const { data, isLoading, refetch } = usePlatformErrors(
    resortFilter === 'all' ? undefined : resortFilter,
    timeRange,
    resorts
  );

  const resolveError = useResolveError();
  const createIncident = useCreateIncident();

  const filteredErrors = data?.errors.filter(e => 
    searchQuery === '' || 
    e.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.error_message.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Group errors by message
  const errorGroups = useMemo(() => {
    return groupErrors(filteredErrors);
  }, [filteredErrors]);

  // Calculate affected resorts from filtered errors
  const affectedResorts = useMemo(() => {
    if (!filteredErrors.length) return [];
    
    const resortCounts = new Map<string, { id: string; name: string; count: number }>();
    
    for (const error of filteredErrors) {
      if (error.resort_id && error.resort_name) {
        const existing = resortCounts.get(error.resort_id);
        if (existing) {
          existing.count++;
        } else {
          resortCounts.set(error.resort_id, {
            id: error.resort_id,
            name: error.resort_name,
            count: 1
          });
        }
      }
    }
    
    return Array.from(resortCounts.values()).sort((a, b) => b.count - a.count);
  }, [filteredErrors]);

  const handleResolve = async (errorId: string) => {
    try {
      await resolveError.mutateAsync(errorId);
      toast.success('Error marked as resolved');
    } catch {
      toast.error('Failed to resolve error');
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle.trim()) {
      toast.error('Please enter an incident title');
      return;
    }

    try {
      await createIncident.mutateAsync({
        title: incidentTitle,
        description: incidentDescription || undefined,
        severity: incidentSeverity,
        affectedResortIds: affectedResorts.map(r => r.id),
        relatedErrorIds: filteredErrors.slice(0, 50).map(e => e.id),
      });
      toast.success('Incident created successfully');
      setCreateIncidentDialogOpen(false);
      setIncidentTitle('');
      setIncidentDescription('');
      setIncidentSeverity('P1');
    } catch {
      toast.error('Failed to create incident');
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

        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="group-toggle" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
            <Layers className="h-3.5 w-3.5" />
            Group
          </Label>
          <Switch 
            id="group-toggle"
            checked={groupByMessage} 
            onCheckedChange={setGroupByMessage}
          />
        </div>

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
        <KpiCard
          label="Total Errors"
          value={data?.metrics.totalErrors || 0}
          icon={AlertTriangle}
          variant="warning"
          loading={isLoading}
          align="left"
        />
        <KpiCard
          label="Trend"
          value={`${data?.metrics.trend || 0}%`}
          icon={Activity}
          variant={(data?.metrics.trend || 0) < 0 ? 'success' : 'destructive'}
          loading={isLoading}
          align="left"
        />

        <Card className="sm:col-span-2">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Top Failing Routes</p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {data?.metrics.topRoutes.slice(0, 3).map((route) => (
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
              {groupByMessage ? 'Error Groups' : 'Error Log'}
              {groupByMessage && errorGroups.length > 0 && (
                <Badge variant="outline" className="text-xs ml-2">
                  {errorGroups.length} group{errorGroups.length !== 1 ? 's' : ''}
                </Badge>
              )}
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
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : groupByMessage ? (
            // Grouped View
            errorGroups.length > 0 ? (
              <ScrollArea className="h-[500px] pr-2">
                <div className="space-y-3">
                  {errorGroups.map(group => (
                    <ErrorGroupCard 
                      key={group.key} 
                      group={group} 
                      onResolve={handleResolve}
                      isResolving={resolveError.isPending}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-success/30 mb-3" />
                <p className="font-medium">No errors found</p>
                <p className="text-sm text-muted-foreground">No errors match your current filters</p>
              </div>
            )
          ) : (
            // Flat View
            filteredErrors.length > 0 ? (
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
            )
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
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-1" 
              onClick={() => navigate('/superadmin/audit')}
            >
              <span className="font-medium text-sm">Show changes before spike</span>
              <span className="text-xs text-muted-foreground">View audit logs around error times</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-1"
              onClick={() => setAffectedResortsDialogOpen(true)}
              disabled={affectedResorts.length === 0}
            >
              <span className="font-medium text-sm">Show affected resorts</span>
              <span className="text-xs text-muted-foreground">
                {affectedResorts.length} resort(s) impacted
              </span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start gap-1"
              onClick={() => setCreateIncidentDialogOpen(true)}
              disabled={filteredErrors.length === 0}
            >
              <span className="font-medium text-sm flex items-center gap-1">
                <Plus className="h-3 w-3" /> Create Incident
              </span>
              <span className="text-xs text-muted-foreground">Link errors to incident</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Affected Resorts Dialog */}
      <Dialog open={affectedResortsDialogOpen} onOpenChange={setAffectedResortsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Affected Resorts
            </DialogTitle>
            <DialogDescription>
              Resorts with errors matching your current filters
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {affectedResorts.map(resort => (
                <Button
                  key={resort.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    if (onResortClick) {
                      onResortClick(resort.id);
                    }
                    setAffectedResortsDialogOpen(false);
                  }}
                >
                  <span>{resort.name}</span>
                  <Badge variant="destructive">{resort.count} errors</Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Incident Dialog */}
      <Dialog open={createIncidentDialogOpen} onOpenChange={setCreateIncidentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-warning" />
              Create Incident
            </DialogTitle>
            <DialogDescription>
              Create an incident to track this error cluster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Incident Title</Label>
              <Input 
                placeholder="e.g., API timeout errors on booking flow"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={incidentSeverity} onValueChange={(v) => setIncidentSeverity(v as typeof incidentSeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P0">P0 - Critical</SelectItem>
                  <SelectItem value="P1">P1 - High</SelectItem>
                  <SelectItem value="P2">P2 - Medium</SelectItem>
                  <SelectItem value="P3">P3 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                placeholder="Additional context..."
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p className="font-medium mb-1">Will be linked:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {Math.min(filteredErrors.length, 50)} error(s)</li>
                <li>• {affectedResorts.length} affected resort(s)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateIncidentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIncident} disabled={createIncident.isPending}>
              {createIncident.isPending ? 'Creating...' : 'Create Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
