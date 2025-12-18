import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Debounce delay in ms. Set to 0 to disable. Default: 300 */
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  debounceMs = 300,
}: SearchInputProps) {
  // Local state for immediate UI feedback
  const [localValue, setLocalValue] = useState(value);
  
  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Debounced onChange
  useEffect(() => {
    if (debounceMs === 0) return;
    
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);
  
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    // Immediate update if no debounce
    if (debounceMs === 0) {
      onChange(newValue);
    }
  }, [debounceMs, onChange]);
  
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
