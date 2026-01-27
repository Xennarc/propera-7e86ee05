import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Clock,
  PlayCircle,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type RequestTabStatus = 'all' | 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

interface StatusTabsProps {
  activeTab: RequestTabStatus;
  onTabChange: (tab: RequestTabStatus) => void;
  counts: Record<string, number>;
  showArchived?: boolean;
}

export function RequestStatusTabs({ activeTab, onTabChange, counts, showArchived = false }: StatusTabsProps) {
  const isMobile = useIsMobile();
  
  // Calculate totals
  const newCount = counts['NEW'] || 0;
  const acknowledgedCount = counts['ACKNOWLEDGED'] || 0;
  const assignedCount = counts['ASSIGNED'] || 0;
  const inProgressCount = counts['IN_PROGRESS'] || 0;
  const activeCount = newCount + acknowledgedCount + assignedCount + inProgressCount;
  const completedCount = counts['COMPLETED'] || 0;

  const getCount = (value: RequestTabStatus): number => {
    if (value === 'all') return activeCount;
    if (value === 'NEW') return newCount + acknowledgedCount + assignedCount; // "Needs attention"
    if (value === 'IN_PROGRESS') return inProgressCount;
    return counts[value] || 0;
  };

  // Core tabs for both mobile and desktop
  const coreOptions: { value: RequestTabStatus; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Active', shortLabel: 'All', icon: <ClipboardList className="h-4 w-4" /> },
    { value: 'NEW', label: 'New', shortLabel: 'New', icon: <Clock className="h-4 w-4" /> },
    { value: 'IN_PROGRESS', label: 'In Progress', shortLabel: 'Active', icon: <PlayCircle className="h-4 w-4" /> },
    { value: 'COMPLETED', label: 'Completed', shortLabel: 'Done', icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  // Mobile: iOS-style segmented control
  if (isMobile) {
    const mobileOptions = coreOptions.map(opt => ({
      value: opt.value,
      label: opt.label,
      shortLabel: opt.shortLabel,
      icon: opt.icon,
      count: getCount(opt.value),
    }));

    return (
      <div className="w-full overflow-x-auto -mx-4 px-4">
        <SegmentedControl
          value={activeTab}
          onChange={(v) => onTabChange(v as RequestTabStatus)}
          options={mobileOptions}
          className="w-full min-w-max"
        />
      </div>
    );
  }

  // Desktop: Standard tabs
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as RequestTabStatus)}>
      <TabsList className="w-full grid grid-cols-4 sm:flex sm:w-auto sm:justify-start h-auto p-1 gap-1">
        {coreOptions.map((tab) => {
          const count = getCount(tab.value);
          const isActive = activeTab === tab.value;

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=active]:shadow-sm"
              )}
            >
              {tab.icon}
              <span className="text-[11px] sm:text-sm font-medium">
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-5 min-w-5 px-1.5 text-[10px] font-semibold',
                    isActive 
                      ? 'bg-primary-foreground/20 text-primary-foreground' 
                      : 'bg-muted'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
        {showArchived && (
          <TabsTrigger
            value="ARCHIVED"
            className="flex items-center gap-2 py-2 px-4 rounded-lg"
          >
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Archived</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
