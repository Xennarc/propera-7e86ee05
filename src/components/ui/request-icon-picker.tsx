import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleDot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRequestIcon, getRequestIconsByCategory, RequestIconOption } from '@/lib/request-icons';

interface RequestIconPickerProps {
  value: string | null;
  onChange: (key: string | null) => void;
  className?: string;
}

export function RequestIconPicker({ value, onChange, className }: RequestIconPickerProps) {
  const [open, setOpen] = useState(false);
  
  const iconsByCategory = getRequestIconsByCategory();
  const SelectedIcon = getRequestIcon(value);
  const selectedOption = value 
    ? Object.values(iconsByCategory).flat().find((opt) => opt.key === value)
    : null;

  const handleSelect = (opt: RequestIconOption | null) => {
    onChange(opt?.key || null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-start gap-2', className)}
        >
          <SelectedIcon className="h-4 w-4" />
          <span className="truncate">
            {selectedOption?.label || 'Category default'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <ScrollArea className="h-80">
          <div className="p-2 space-y-3">
            {/* Clear / Default option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors',
                !value && 'bg-primary/10 text-primary'
              )}
            >
              <CircleDot className="h-4 w-4" />
              <span>Use category default</span>
              {!value && <X className="h-3 w-3 ml-auto opacity-50" />}
            </button>

            {/* Icon categories */}
            {Object.entries(iconsByCategory).map(([category, options]) => (
              <div key={category}>
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  {category}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {options.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = value === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelect(opt)}
                        title={opt.label}
                        className={cn(
                          'flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors',
                          isSelected && 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        )}
                      >
                        <Icon className="h-4 w-4" />
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
