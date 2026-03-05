import { useParams, useLocation, Link } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useState } from 'react';
import { getMobileNavModules, MODULE_REGISTRY, type ModuleRegistryEntry } from '@/lib/departments/module-registry';
import type { DepartmentModuleKey } from '@/types/database';

export function DepartmentBottomNav() {
  const { deptKey } = useParams<{ deptKey: string }>();
  const location = useLocation();
  const { hasModule, isManager } = useDepartment();
  const [moreOpen, setMoreOpen] = useState(false);

  const baseUrl = `/staff/dept/${deptKey}`;

  const isVisible = (entry: ModuleRegistryEntry): boolean => {
    if (entry.requiresManager && !isManager) return false;
    if (entry.isToggleable) return hasModule(entry.key as DepartmentModuleKey);
    return true;
  };

  // Primary: mobile-nav-eligible modules that are visible
  const primaryItems = getMobileNavModules().filter(isVisible);

  // More: everything else that's visible but not in primary
  const primaryKeys = new Set(primaryItems.map(m => m.key));
  const moreItems = MODULE_REGISTRY
    .filter(m => !primaryKeys.has(m.key) && isVisible(m));

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path.replace('/assets', ''));

  const hasMore = moreItems.length > 0;

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-sm safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryItems.map(entry => {
            const url = `${baseUrl}/${entry.routeSegment}`;
            const Icon = entry.icon;
            return (
              <Link
                key={entry.key}
                to={url}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] min-h-[44px] rounded-lg transition-colors',
                  isActive(url) ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{entry.label}</span>
              </Link>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] min-h-[44px] rounded-lg text-muted-foreground transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          )}
        </div>
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="Quick Navigation">
        <div className="grid grid-cols-3 gap-3 pb-6">
          {moreItems.map(entry => {
            const url = `${baseUrl}/${entry.routeSegment}`;
            const active = isActive(url);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.key}
                to={url}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2.5 p-4 min-h-[88px] rounded-2xl border',
                  'transition-all duration-200 active:scale-[0.97]',
                  'bg-muted/30 border-border/30',
                  active && 'bg-primary/10 border-primary/30 text-primary'
                )}
              >
                <Icon className={cn('h-6 w-6', active && 'text-primary')} />
                <span className={cn(
                  'text-xs font-medium text-center leading-tight',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}>
                  {entry.label}
                </span>
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
