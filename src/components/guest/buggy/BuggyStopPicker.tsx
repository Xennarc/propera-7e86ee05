import { useState, useMemo } from 'react';
import { Check, MapPin, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

interface BuggyStop {
  id: string;
  name: string;
  zone: string | null;
  sort_order: number;
}

interface BuggyStopPickerProps {
  stops: BuggyStop[];
  value: string | null;
  onChange: (stopId: string | null, isOther: boolean, otherText?: string) => void;
  label: string;
  placeholder?: string;
  otherValue?: string;
  onOtherChange?: (text: string) => void;
  showOtherOption?: boolean;
  disabled?: boolean;
}

export function BuggyStopPicker({
  stops,
  value,
  onChange,
  label,
  placeholder = 'Select location...',
  otherValue = '',
  onOtherChange,
  showOtherOption = true,
  disabled = false,
}: BuggyStopPickerProps) {
  const [open, setOpen] = useState(false);
  const [isOther, setIsOther] = useState(false);

  // Group stops by zone
  const groupedStops = useMemo(() => {
    const groups: Record<string, BuggyStop[]> = {};
    stops.forEach(stop => {
      const zone = stop.zone || 'General';
      if (!groups[zone]) groups[zone] = [];
      groups[zone].push(stop);
    });
    return groups;
  }, [stops]);

  const selectedStop = stops.find(s => s.id === value);
  const displayValue = isOther 
    ? (otherValue || 'Custom location') 
    : (selectedStop?.name || placeholder);

  const handleSelect = (stopId: string) => {
    if (stopId === '__other__') {
      setIsOther(true);
      onChange(null, true, otherValue);
    } else {
      setIsOther(false);
      onChange(stopId, false);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between h-12 text-left font-normal",
              !value && !isOther && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{displayValue}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search locations..." className="h-11" />
            <CommandList className="max-h-64">
              <CommandEmpty>No location found.</CommandEmpty>
              
              {Object.entries(groupedStops).map(([zone, zoneStops]) => (
                <CommandGroup key={zone} heading={zone}>
                  {zoneStops.map(stop => (
                    <CommandItem
                      key={stop.id}
                      value={stop.name}
                      onSelect={() => handleSelect(stop.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === stop.id && !isOther ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {stop.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              
              {showOtherOption && (
                <CommandGroup heading="Other">
                  <CommandItem
                    value="__other__"
                    onSelect={() => handleSelect('__other__')}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isOther ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-muted-foreground">Enter custom location...</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Custom location input */}
      {isOther && (
        <Input
          value={otherValue}
          onChange={(e) => {
            onOtherChange?.(e.target.value);
            onChange(null, true, e.target.value);
          }}
          placeholder="e.g., Beach Villa 42, Main Pool"
          className="h-12"
          disabled={disabled}
        />
      )}
    </div>
  );
}
