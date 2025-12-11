import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  allowDecimal?: boolean;
}

/**
 * NumericInput - A number input that allows empty values while typing
 * 
 * Unlike standard number inputs with immediate parsing, this component:
 * - Allows the field to be cleared completely while typing
 * - Only commits the value on blur
 * - Falls back to defaultValue (or min) if left empty
 */
export function NumericInput({
  value,
  onChange,
  min,
  max,
  defaultValue,
  allowDecimal = false,
  className,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>(value.toString());
  
  // Sync display value when external value changes (e.g., form reset)
  React.useEffect(() => {
    setDisplayValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string, digits, and optionally decimal point
    if (inputValue === '' || inputValue === '-') {
      setDisplayValue(inputValue);
      return;
    }
    
    // Validate input format
    const regex = allowDecimal ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (regex.test(inputValue)) {
      setDisplayValue(inputValue);
    }
  };

  const handleBlur = () => {
    let numValue: number;
    
    if (displayValue === '' || displayValue === '-') {
      // Use defaultValue, then min, then 0 as fallback
      numValue = defaultValue ?? min ?? 0;
    } else {
      numValue = allowDecimal ? parseFloat(displayValue) : parseInt(displayValue, 10);
      if (isNaN(numValue)) {
        numValue = defaultValue ?? min ?? 0;
      }
    }
    
    // Clamp to min/max
    if (min !== undefined && numValue < min) numValue = min;
    if (max !== undefined && numValue > max) numValue = max;
    
    setDisplayValue(numValue.toString());
    onChange(numValue);
  };

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn("[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", className)}
      {...props}
    />
  );
}
