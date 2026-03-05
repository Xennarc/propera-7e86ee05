import { useParams, useLocation, Link } from 'react-router-dom';
import { useDepartment } from '@/contexts/DepartmentContext';
import { CalendarDays, LayoutList, Inbox, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DepartmentBottomNav() {
  const { deptKey } = useParams<{ deptKey: string }>();
  const location = useLocation();
  const { hasModule } = useDepartment();

  const baseUrl = `/dept/${deptKey}`;
  const hasAnyResource = hasModule('resources_assets') || hasModule('resources_shifts') || hasModule('resources_unavailability');

  const items = [
    { title: 'Planner', url: `${baseUrl}/planner`, icon: CalendarDays, visible: hasModule('ops_planner') },
    { title: 'Master', url: `${baseUrl}/master`, icon: LayoutList, visible: hasModule('master_ops_sheet') },
    { title: 'Inbox', url: `${baseUrl}/inbox`, icon: Inbox, visible: hasModule('ops_inbox') },
    { title: 'Resources', url: `${baseUrl}/resources/assets`, icon: Wrench, visible: hasAnyResource },
  ].filter(item => item.visible);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path.replace('/assets', ''));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/30 bg-background/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map(item => (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] min-h-[44px] rounded-lg transition-colors',
              isActive(item.url)
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
