import { useState } from 'react';
import { useSecurityAudit, useSecurityAuditSummary, SecurityAuditIssue } from '@/hooks/useSecurityAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronDown, 
  Copy, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const severityConfig = {
  CRITICAL: { color: 'bg-destructive text-destructive-foreground', icon: ShieldAlert },
  HIGH: { color: 'bg-orange-500 text-white', icon: AlertTriangle },
  MEDIUM: { color: 'bg-yellow-500 text-black', icon: Shield },
  LOW: { color: 'bg-blue-500 text-white', icon: Shield },
};

const issueTypeLabels: Record<string, string> = {
  RLS_DISABLED: 'RLS Disabled',
  FORCE_RLS_DISABLED: 'Force RLS Disabled',
  NO_POLICIES: 'No Policies',
  UPDATE_MISSING_WITH_CHECK: 'UPDATE Missing WITH CHECK',
  NULLABLE_RESORT_ID: 'Nullable resort_id',
  MISSING_IMMUTABILITY_TRIGGER: 'Missing Immutability Trigger',
};

interface SecurityAuditPanelProps {
  className?: string;
}

export function SecurityAuditPanel({ className }: SecurityAuditPanelProps) {
  const { data: issues, isLoading, refetch, isRefetching } = useSecurityAudit();
  const { data: summary } = useSecurityAuditSummary();
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const copyFix = (fix: string) => {
    navigator.clipboard.writeText(fix);
    toast.success('SQL copied to clipboard');
  };

  const groupedIssues = issues?.reduce((acc, issue) => {
    const key = issue.issue_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(issue);
    return acc;
  }, {} as Record<string, SecurityAuditIssue[]>) || {};

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasNoIssues = !issues || issues.length === 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasNoIssues ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            )}
            <CardTitle className="text-lg">Security Posture</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
        <CardDescription>
          {hasNoIssues 
            ? 'All security checks passed' 
            : `${summary?.total_issues || issues?.length || 0} issues found`
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        {summary && !hasNoIssues && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {summary.critical_count > 0 && (
              <Badge variant="destructive">
                {summary.critical_count} Critical
              </Badge>
            )}
            {summary.high_count > 0 && (
              <Badge className="bg-orange-500 hover:bg-orange-600">
                {summary.high_count} High
              </Badge>
            )}
            {summary.medium_count > 0 && (
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                {summary.medium_count} Medium
              </Badge>
            )}
          </div>
        )}

        {hasNoIssues ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm text-muted-foreground">
              No RLS or tenant isolation issues detected.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {Object.entries(groupedIssues).map(([issueType, typeIssues]) => {
                const firstIssue = typeIssues[0];
                const config = severityConfig[firstIssue.severity as keyof typeof severityConfig] || severityConfig.MEDIUM;
                const IconComponent = config.icon;
                const isExpanded = expandedIssues.has(issueType);

                return (
                  <Collapsible 
                    key={issueType} 
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(issueType)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium text-sm">
                              {issueTypeLabels[issueType] || issueType}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {typeIssues.length} table{typeIssues.length !== 1 ? 's' : ''} affected
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs", config.color)}>
                            {firstIssue.severity}
                          </Badge>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 ml-7 space-y-2">
                        {typeIssues.map((issue, idx) => (
                          <div 
                            key={`${issue.table_name}-${idx}`}
                            className="p-3 rounded-md bg-muted/50 text-sm"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                                {issue.schema_name}.{issue.table_name}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyFix(issue.recommended_fix);
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Fix
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {issue.details}
                            </p>
                            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                              {issue.recommended_fix}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
