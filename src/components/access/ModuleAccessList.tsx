import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModuleCategoryGroup } from '@/hooks/useModulePermissions';
import { ModuleAccessCard } from './ModuleAccessCard';

interface ModuleAccessListProps {
  groups: ModuleCategoryGroup[];
  readOnly?: boolean;
  userId?: string;
  resortId?: string;
  rolePermissions?: string[];
  userOverrides?: Array<{ permission_key: string; effect: string }>;
  onChangeRecorded?: (moduleLabel: string, description: string, isSensitive: boolean) => void;
}

export function ModuleAccessList({
  groups,
  readOnly,
  userId,
  resortId,
  rolePermissions,
  userOverrides,
  onChangeRecorded,
}: ModuleAccessListProps) {
  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">No modules match the current filters.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting the search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <Collapsible key={group.category} defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group">
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
            {group.category}
            <Badge variant="subtle" className="ml-auto text-[10px] px-1.5 py-0 font-normal tabular-nums">
              {group.modules.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1.5 pt-1.5">
              {group.modules.map(m => (
                <ModuleAccessCard
                  key={m.module.id}
                  state={m}
                  readOnly={readOnly}
                  userId={userId}
                  resortId={resortId}
                  rolePermissions={rolePermissions}
                  userOverrides={userOverrides}
                  onChangeRecorded={onChangeRecorded}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
