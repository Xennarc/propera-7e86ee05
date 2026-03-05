import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ModuleCategoryGroup } from '@/hooks/useModulePermissions';
import { ModuleAccessCard } from './ModuleAccessCard';

interface ModuleAccessListProps {
  groups: ModuleCategoryGroup[];
  readOnly?: boolean;
  userId?: string;
  resortId?: string;
  rolePermissions?: string[];
  userOverrides?: Array<{ permission_key: string; effect: string }>;
}

export function ModuleAccessList({
  groups,
  readOnly,
  userId,
  resortId,
  rolePermissions,
  userOverrides,
}: ModuleAccessListProps) {
  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No modules match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <Collapsible key={group.category} defaultOpen>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=closed]_&]:-rotate-90" />
            {group.category}
            <span className="ml-auto text-[10px] font-normal tabular-nums">{group.modules.length}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-1 pt-1">
              {group.modules.map(m => (
                <ModuleAccessCard
                  key={m.module.id}
                  state={m}
                  readOnly={readOnly}
                  userId={userId}
                  resortId={resortId}
                  rolePermissions={rolePermissions}
                  userOverrides={userOverrides}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
