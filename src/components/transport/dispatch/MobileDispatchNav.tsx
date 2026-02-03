import { Badge } from '@/components/ui/badge';
import { ClipboardList, Route, Car } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileDispatchTab = 'queue' | 'trips' | 'resources';

interface MobileDispatchNavProps {
  activeTab: MobileDispatchTab;
  onTabChange: (tab: MobileDispatchTab) => void;
  queueCount: number;
  tripsCount: number;
}

const tabs: Array<{
  key: MobileDispatchTab;
  label: string;
  icon: typeof ClipboardList;
}> = [
  { key: 'queue', label: 'Queue', icon: ClipboardList },
  { key: 'trips', label: 'Trips', icon: Route },
  { key: 'resources', label: 'Resources', icon: Car },
];

export function MobileDispatchNav({
  activeTab,
  onTabChange,
  queueCount,
  tripsCount,
}: MobileDispatchNavProps) {
  const getBadgeCount = (key: MobileDispatchTab) => {
    if (key === 'queue') return queueCount;
    if (key === 'trips') return tripsCount;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/40 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-stretch h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = getBadgeCount(tab.key);

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {count > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-2 -right-3 h-4 min-w-[16px] px-1 text-[10px] font-bold"
                  >
                    {count > 99 ? '99+' : count}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
