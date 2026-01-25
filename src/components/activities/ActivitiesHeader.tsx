import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { CategoryChip } from '@/components/ui/category-badge';
import { ActivityCategoryKey } from '@/lib/activity-category-config';
import { cn } from '@/lib/utils';
import { DemoActionWrapper } from '@/components/ui/demo-action-wrapper';

type ViewMode = 'cards' | 'table';

interface ActivitiesHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedCategory: ActivityCategoryKey | 'all';
  onCategoryChange: (category: ActivityCategoryKey | 'all') => void;
  categoryCounts: Record<string, number>;
  onAddActivity: () => void;
  isReadOnly?: boolean;
}

const FILTER_CATEGORIES: (ActivityCategoryKey | 'all')[] = [
  'all',
  'DIVE',
  'EXCURSION',
  'WATERSPORT',
  'SPA',
  'OTHER'
];

export function ActivitiesHeader({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedCategory,
  onCategoryChange,
  categoryCounts,
  onAddActivity,
  isReadOnly = false,
}: ActivitiesHeaderProps) {
  const totalCount = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Top Row: Title, Search, Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Activities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage resort activities and excursions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle - Desktop only */}
          <div className="hidden sm:flex items-center border border-border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onViewModeChange('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => onViewModeChange('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <DemoActionWrapper isReadOnly={isReadOnly} tooltipText="Creating activities is disabled in demo mode">
            <Button onClick={onAddActivity} disabled={isReadOnly} className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Add Activity</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </DemoActionWrapper>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Category Chips - Horizontal scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {FILTER_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              isActive={selectedCategory === cat}
              onClick={() => onCategoryChange(cat)}
              count={cat === 'all' ? totalCount : categoryCounts[cat] || 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
