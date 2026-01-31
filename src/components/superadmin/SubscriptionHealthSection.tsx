import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { getTierInfo, type SubscriptionTier } from '@/lib/tier-features';
import {
  useSubscriptionAlerts,
  useResolveAlert,
  useGenerateAlerts,
  getDaysRemaining,
  type SubscriptionAlert,
} from '@/hooks/useSubscriptionAlerts';

const TIER_OPTIONS = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as const;

export function SubscriptionHealthSection() {
  const [alertTypeFilter, setAlertTypeFilter] = useState<'EXPIRING_SOON' | 'EXPIRED' | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: alerts, isLoading } = useSubscriptionAlerts({
    alertType: alertTypeFilter === 'all' ? null : alertTypeFilter,
    tier: tierFilter === 'all' ? null : tierFilter,
    search: searchQuery || undefined,
  });

  const resolveAlert = useResolveAlert();
  const generateAlerts = useGenerateAlerts();

  const handleResolve = async (alertId: string) => {
    await resolveAlert.mutateAsync(alertId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Subscription Health
            </CardTitle>
            <CardDescription>
              Monitor expiring and expired subscriptions across resorts.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAlerts.mutate(14)}
            disabled={generateAlerts.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateAlerts.isPending ? 'animate-spin' : ''}`} />
            {generateAlerts.isPending ? 'Scanning...' : 'Scan Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={alertTypeFilter} onValueChange={(v) => setAlertTypeFilter(v as typeof alertTypeFilter)}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Alert type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All alerts</SelectItem>
              <SelectItem value="EXPIRING_SOON">Expiring soon</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36 h-10">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {TIER_OPTIONS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {getTierInfo(tier).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !alerts || alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-success/30 mb-3" />
            <p className="font-medium text-success">All subscriptions healthy</p>
            <p className="text-sm text-muted-foreground">
              No expiring or expired subscriptions found.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Resort
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Tier
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Expires
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Days
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onResolve={handleResolve}
                    isResolving={resolveAlert.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({
  alert,
  onResolve,
  isResolving,
}: {
  alert: SubscriptionAlert;
  onResolve: (id: string) => void;
  isResolving: boolean;
}) {
  const resort = alert.resort;
  const tier = (resort?.subscription_tier || 'ESSENTIAL') as SubscriptionTier;
  const tierInfo = getTierInfo(tier);
  const daysRemaining = getDaysRemaining(resort?.subscription_expires_at || null);
  const isExpired = alert.alert_type === 'EXPIRED';

  return (
    <TableRow className="transition-colors">
      <TableCell>
        <Link
          to={`/superadmin/resorts/${resort?.id}`}
          className="font-medium hover:underline text-primary"
        >
          {resort?.name || 'Unknown Resort'}
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`capitalize ${
            tier === 'ELITE'
              ? 'bg-primary/10 text-primary border-primary/30'
              : tier === 'PROFESSIONAL'
                ? 'bg-info/10 text-info border-info/30'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {tierInfo.name}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {resort?.subscription_expires_at
          ? format(new Date(resort.subscription_expires_at), 'MMM d, yyyy')
          : '-'}
      </TableCell>
      <TableCell>
        {daysRemaining !== null ? (
          <span
            className={`text-sm font-medium ${
              daysRemaining <= 0
                ? 'text-destructive'
                : daysRemaining <= 7
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }`}
          >
            {daysRemaining <= 0 ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d`}
          </span>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell>
        {isExpired ? (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Expired
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
            <Clock className="h-3 w-3" />
            Expiring
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onResolve(alert.id)}
            disabled={isResolving}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Resolve
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/superadmin/resorts/${resort?.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
