import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface EnhancedTimePickerProps {
  value: string; // HH:mm format (24h)
  onChange: (value: string) => void;
  label?: string;
  use24Hour?: boolean;
  minuteStep?: 15 | 30 | 5 | 1;
  className?: string;
  disabled?: boolean;
}

export function EnhancedTimePicker({
  value,
  onChange,
  label,
  use24Hour = false,
  minuteStep = 15,
  className,
  disabled = false,
}: EnhancedTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse the 24h time value
  const parseTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return { hours: 12, minutes: 0 };
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return {
      hours: Math.min(23, Math.max(0, h)),
      minutes: Math.min(59, Math.max(0, m)),
    };
  };

  const { hours, minutes } = parseTime(value);

  // Convert to 12h format for display
  const isPM = hours >= 12;
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  // Format display string
  const displayTime = use24Hour
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : `${hours12}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  const handleHourSelect = (newHour: number) => {
    let hour24 = newHour;
    if (!use24Hour) {
      if (isPM) {
        hour24 = newHour === 12 ? 12 : newHour + 12;
      } else {
        hour24 = newHour === 12 ? 0 : newHour;
      }
    }
    onChange(`${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  const handleMinuteSelect = (newMinute: number) => {
    onChange(`${String(hours).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`);
  };

  const handlePeriodToggle = () => {
    const newHours = isPM ? hours - 12 : hours + 12;
    onChange(`${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  // Generate minute options based on step
  const minuteOptions = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);

  // Generate hour options
  const hourOptions = use24Hour
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-10',
              !value && 'text-muted-foreground'
            )}
          >
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            {displayTime}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            {/* Hour selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Hour</Label>
              <div className="grid grid-cols-6 gap-1">
                {hourOptions.map((h) => {
                  const isSelected = use24Hour ? hours === h : hours12 === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={cn(
                        'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {use24Hour ? String(h).padStart(2, '0') : h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Minute</Label>
              <div className="flex gap-1">
                {minuteOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      'flex-1 h-9 rounded-md text-sm font-medium transition-colors',
                      minutes === m
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted border border-border'
                    )}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM toggle (only for 12h mode) */}
            {!use24Hour && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Period</Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => isPM && handlePeriodToggle()}
                    className={cn(
                      'flex-1 h-9 rounded-md text-sm font-medium transition-colors',
                      !isPM
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted border border-border'
                    )}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => !isPM && handlePeriodToggle()}
                    className={cn(
                      'flex-1 h-9 rounded-md text-sm font-medium transition-colors',
                      isPM
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted border border-border'
                    )}
                  >
                    PM
                  </button>
                </div>
              </div>
            )}

            {/* Done button */}
            <Button
              className="w-full"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Quick time preset buttons
interface TimePreset {
  label: string;
  value: string;
}

interface TimePresetsProps {
  presets: TimePreset[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePresets({ presets, value, onChange, className }: TimePresetsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(preset.value)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-colors',
            value === preset.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
