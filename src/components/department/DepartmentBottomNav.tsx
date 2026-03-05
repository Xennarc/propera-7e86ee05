import { useParams, useLocation, Link } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { CalendarDays, LayoutList, Inbox, Wrench, MoreHorizontal, Users, Settings, ShieldCheck, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useState } from 'react';

export function DepartmentBottomNav() {
  const { deptKey } = useParams<{ deptKey: string }>();
  const location = useLocation();
  const { hasModule, isManager } = useDepartment();
  const [moreOpen, setMoreOpen] = useState(false);

  const baseUrl = `/staff/dept/${deptKey}`;

  const primaryItems = [
    { title: 'Planner', url: `${baseUrl}/planner`, icon: CalendarDays, visible: hasModule('ops_planner') },
    { title: 'Master', url: `${baseUrl}/master`, icon: LayoutList, visible: hasModule('master_ops_sheet') },
    { title: 'Inbox', url: `${baseUrl}/inbox`, icon: Inbox, visible: hasModule('ops_inbox') },
    { title: 'Resources', url: `${baseUrl}/resources/assets`, icon: Wrench, visible: hasModule('resources_assets') || hasModule('resources_shifts') || hasModule('resources_unavailability') },
  ].filter(item => item.visible);

  const moreItems = [
    { title: 'Cert Verification', url: `${baseUrl}/compliance/verify`, icon: ShieldCheck, visible: hasModule('compliance_verify') },
    { title: 'Medical Review', url: `${baseUrl}/compliance/medical`, icon: HeartPulse, visible: hasModule('compliance_medical') },
    { title: 'Manage Access', url: `${baseUrl}/manage/access`, icon: Users, visible: isManager },
    { title: 'Settings', url: `${baseUrl}/settings`, icon: Settings, visible: isManager },
  ].filter(item => item.visible);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path.replace('/assets', ''));
  const hasMore = moreItems.length > 0;

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-sm safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryItems.map(item => (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[56px] min-h-[44px] rounded-lg transition-colors',
                isActive(item.url) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          ))}
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
          {moreItems.map(item => {
            const active = isActive(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2.5 p-4 min-h-[88px] rounded-2xl border',
                  'transition-all duration-200 active:scale-[0.97]',
                  'bg-muted/30 border-border/30',
                  active && 'bg-primary/10 border-primary/30 text-primary'
                )}
              >
                <item.icon className={cn('h-6 w-6', active && 'text-primary')} />
                <span className={cn(
                  'text-xs font-medium text-center leading-tight',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
