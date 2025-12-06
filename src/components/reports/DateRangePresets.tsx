import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths, startOfYear } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePresetsProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

type PresetKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const PRESETS: { key: PresetKey; label: string; getRange: () => { start: Date; end: Date } }[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => ({ start: new Date(), end: new Date() }),
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { start: yesterday, end: yesterday };
    },
  },
  {
    key: 'last7',
    label: 'Last 7 days',
    getRange: () => ({ start: subDays(new Date(), 6), end: new Date() }),
  },
  {
    key: 'last30',
    label: 'Last 30 days',
    getRange: () => ({ start: subDays(new Date(), 29), end: new Date() }),
  },
  {
    key: 'thisWeek',
    label: 'This week',
    getRange: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
  },
  {
    key: 'thisMonth',
    label: 'This month',
    getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
  },
  {
    key: 'lastMonth',
    label: 'Last month',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    },
  },
  {
    key: 'thisYear',
    label: 'This year',
    getRange: () => ({ start: startOfYear(new Date()), end: new Date() }),
  },
];

export function DateRangePresets({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePresetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    const range = preset.getRange();
    onStartDateChange(format(range.start, 'yyyy-MM-dd'));
    onEndDateChange(format(range.end, 'yyyy-MM-dd'));
    setActivePreset(preset.key);
    setIsOpen(false);
  };

  const handleCustomDate = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      onStartDateChange(value);
    } else {
      onEndDateChange(value);
    }
    setActivePreset('custom');
  };

  // Determine the current preset label
  const getCurrentLabel = () => {
    if (activePreset && activePreset !== 'custom') {
      const preset = PRESETS.find(p => p.key === activePreset);
      return preset?.label || 'Custom';
    }
    
    // Check if current dates match any preset
    for (const preset of PRESETS) {
      const range = preset.getRange();
      if (
        format(range.start, 'yyyy-MM-dd') === startDate &&
        format(range.end, 'yyyy-MM-dd') === endDate
      ) {
        return preset.label;
      }
    }
    
    return `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Presets Row */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.slice(0, 4).map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              "h-7 text-xs px-2.5",
              activePreset === preset.key && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
        
        {/* More Presets Dropdown */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 gap-1">
              More
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col">
              {PRESETS.slice(4).map((preset) => (
                <Button
                  key={preset.key}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-start rounded-none h-9 px-3",
                    activePreset === preset.key && "bg-primary/10 text-primary"
                  )}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Custom Date Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDate('start', e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDate('end', e.target.value)}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
