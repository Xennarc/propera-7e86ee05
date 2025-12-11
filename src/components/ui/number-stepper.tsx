import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  disabled = false,
  className,
}: NumberStepperProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(value.toString());

  // Sync display value when external value changes
  React.useEffect(() => {
    setDisplayValue(value.toString());
  }, [value]);

  const handleDecrement = () => {
    if (value > min) {
      const newValue = value - 1;
      onChange(newValue);
      setDisplayValue(newValue.toString());
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      const newValue = value + 1;
      onChange(newValue);
      setDisplayValue(newValue.toString());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string while typing
    if (inputValue === '') {
      setDisplayValue('');
      return;
    }
    
    // Only allow digits
    if (/^\d*$/.test(inputValue)) {
      setDisplayValue(inputValue);
    }
  };

  const handleBlur = () => {
    let numValue: number;
    
    if (displayValue === '') {
      numValue = min;
    } else {
      numValue = parseInt(displayValue, 10);
      if (isNaN(numValue)) {
        numValue = min;
      }
    }
    
    // Clamp to min/max
    numValue = Math.max(min, Math.min(max, numValue));
    
    setDisplayValue(numValue.toString());
    onChange(numValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label || 'value'}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="h-10 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={label || 'Number input'}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label || 'value'}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
