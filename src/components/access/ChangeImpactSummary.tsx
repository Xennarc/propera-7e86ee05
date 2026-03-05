import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Activity, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export interface AccessChange {
  id: string;
  moduleLabel: string;
  description: string;
  isSensitive: boolean;
}

interface ChangeImpactSummaryProps {
  changes: AccessChange[];
}

export function ChangeImpactSummary({ changes }: ChangeImpactSummaryProps) {
  const [open, setOpen] = useState(true);

  if (changes.length === 0) return null;

  const sensitiveCount = changes.filter(c => c.isSensitive).length;

  return (
    <div className="border-t border-border/40 bg-muted/20 px-6 py-3 shrink-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${!open ? '-rotate-90' : ''}`} />
          <Activity className="h-3.5 w-3.5" />
          <span>Session changes</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 tabular-nums">
            {changes.length}
          </Badge>
          {sensitiveCount > 0 && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0 gap-1">
              <ShieldAlert className="h-2.5 w-2.5" />
              {sensitiveCount}
            </Badge>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2.5 space-y-0.5 max-h-[140px] overflow-y-auto">
            {changes.map(change => (
              <div
                key={change.id}
                className={`flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg ${
                  change.isSensitive ? 'bg-warning/5 text-warning' : 'text-muted-foreground'
                }`}
              >
                <span className="font-medium shrink-0">{change.moduleLabel}:</span>
                <span className="truncate">{change.description}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
