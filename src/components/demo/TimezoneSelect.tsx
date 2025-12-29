import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { detectUserTimezone, mapToSupportedTimezone } from '@/hooks/useDemoWorkspace';

const TIMEZONES = [
  { value: 'Indian/Maldives', label: 'Maldives', offset: 'UTC+5' },
  { value: 'Asia/Bangkok', label: 'Thailand', offset: 'UTC+7' },
  { value: 'Asia/Jakarta', label: 'Indonesia', offset: 'UTC+7' },
  { value: 'Asia/Manila', label: 'Philippines', offset: 'UTC+8' },
  { value: 'America/Cancun', label: 'Mexico/Caribbean', offset: 'UTC-5' },
  { value: 'Asia/Dubai', label: 'UAE', offset: 'UTC+4' },
  { value: 'Indian/Mauritius', label: 'Mauritius', offset: 'UTC+4' },
  { value: 'Indian/Mahe', label: 'Seychelles', offset: 'UTC+4' },
  { value: 'UTC', label: 'Other (UTC)', offset: 'UTC+0' },
];

interface TimezoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  autoDetect?: boolean;
}

export function TimezoneSelect({ 
  value, 
  onValueChange,
  autoDetect = true,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false);

  // Auto-detect timezone on mount if no value set
  useEffect(() => {
    if (autoDetect && !value) {
      const detected = detectUserTimezone();
      const mapped = mapToSupportedTimezone(detected);
      if (mapped && TIMEZONES.some(tz => tz.value === mapped)) {
        onValueChange(mapped);
      }
    }
  }, [autoDetect, value, onValueChange]);

  const selectedTimezone = useMemo(() => 
    TIMEZONES.find(tz => tz.value === value),
    [value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedTimezone ? (
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{selectedTimezone.label}</span>
              <span className="text-muted-foreground text-xs flex-shrink-0">
                ({selectedTimezone.offset})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select timezone...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[300px] p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={`${tz.label} ${tz.offset}`}
                  onSelect={() => {
                    onValueChange(tz.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tz.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{tz.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {tz.offset}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
