import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileWarning } from 'lucide-react';
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
    <div className="border-t border-border bg-muted/30 px-6 py-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${!open ? '-rotate-90' : ''}`} />
          <FileWarning className="h-3.5 w-3.5" />
          Changes this session
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
            {changes.length}
          </Badge>
          {sensitiveCount > 0 && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              {sensitiveCount} sensitive
            </Badge>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1">
            {changes.map(change => (
              <div
                key={change.id}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded ${
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
