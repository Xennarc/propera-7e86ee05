import { useState } from 'react';
import { cn } from '@/lib/utils';
import { activityIconOptions, getIconsByCategory, type ActivityIconOption } from '@/lib/activity-icons';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronDown } from 'lucide-react';

interface ActivityIconPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ActivityIconPicker({ value, onChange, disabled }: ActivityIconPickerProps) {
  const [open, setOpen] = useState(false);
  const iconsByCategory = getIconsByCategory();
  const categories = Object.keys(iconsByCategory);
  
  const selectedOption = value 
    ? activityIconOptions.find(o => o.key === value) 
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-10"
        >
          <span className="flex items-center gap-2">
            {selectedOption ? (
              <>
                <selectedOption.icon className="h-4 w-4 text-primary" />
                <span>{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select an icon (optional)</span>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-2">
            {/* Clear selection option */}
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors",
                !value && "bg-primary/10 text-primary"
              )}
            >
              <span className="h-4 w-4" />
              <span>Use category default</span>
              {!value && <Check className="ml-auto h-4 w-4" />}
            </button>
            
            {/* Icons by category */}
            {categories.map((category) => (
              <div key={category} className="mt-3">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </div>
                <div className="grid grid-cols-4 gap-1 mt-1">
                  {iconsByCategory[category].map((option) => {
                    const Icon = option.icon;
                    const isSelected = value === option.key;
                    return (
                      <button
                        key={option.key}
                        onClick={() => {
                          onChange(option.key);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg p-2 text-xs transition-colors hover:bg-muted",
                          isSelected && "bg-primary/10 text-primary ring-1 ring-primary/30"
                        )}
                        title={option.label}
                      >
                        <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate w-full text-center text-[10px]">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
