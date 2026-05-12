import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';

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

const PRESETS_OPTIMIZED = PRESETS.map(p => {
  return {
    ...p,
    // Add logic here to cache date range strings if needed, or simply let the caller pass down the strings
  }
});

function originalGetCurrentLabel(startDate: string, endDate: string) {
    for (const preset of PRESETS) {
      const range = preset.getRange();
      if (
        format(range.start, 'yyyy-MM-dd') === startDate &&
        format(range.end, 'yyyy-MM-dd') === endDate
      ) {
        return preset.label;
      }
    }
    return 'Custom';
}

// We want to pre-calculate the date strings for the presets since they mostly depend on "now" (which could be fixed for a render cycle or cached).
// However, presets getRange() creates new dates every time.
// Wait, today, yesterday, etc., are usually constant over a single user session or day.
// Could we just memoize the strings? Or memoize them outside the component?

// Let's create an optimized version that only computes formatting once per preset per day, or simply let's pass an optimized function.

function optimizedGetCurrentLabel(startDate: string, endDate: string) {
    // Actually, PRESETS has only 8 items.
    // The main cost is calling `getRange()` 8 times and calling `format()` 16 times *every time getCurrentLabel is called*.
    // And `getCurrentLabel` might be called during render (wait, is it called during render? Yes, it's defined in component body and used... where?)
}
