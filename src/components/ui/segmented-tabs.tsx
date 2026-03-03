/**
 * SegmentedTabs – Sticky 3-tab (or N-tab) segmented control.
 * 44px height, full-width, underline indicator.
 */
import { cn } from '@/lib/utils';

export interface SegmentedTab {
  key: string;
  label: string;
  badge?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function SegmentedTabs({ tabs, activeKey, onChange, className }: SegmentedTabsProps) {
  return (
    <div className={cn('flex h-11 border-b border-border/40 bg-background', className)}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex-1 relative text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-1.5',
            activeKey === tab.key
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/70',
          )}
        >
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
          {activeKey === tab.key && (
            <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
