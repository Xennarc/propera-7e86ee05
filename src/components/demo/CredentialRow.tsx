import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { cn } from '@/lib/utils';

interface CredentialRowProps {
  label: string;
  value: string;
  isSensitive?: boolean;
  monospace?: boolean;
  className?: string;
}

export function CredentialRow({ 
  label, 
  value, 
  isSensitive = false,
  monospace = false,
  className,
}: CredentialRowProps) {
  const [revealed, setRevealed] = useState(!isSensitive);

  const displayValue = revealed ? value : '••••••••';

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="text-muted-foreground flex-shrink-0">{label}:</span>
      <span 
        className={cn(
          'font-medium flex-1 min-w-0',
          monospace && 'font-mono bg-background px-2 py-0.5 rounded border text-sm tracking-wider',
          !monospace && 'text-xs break-all'
        )}
      >
        {displayValue}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isSensitive && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRevealed(!revealed)}
            className="h-7 w-7"
          >
            {revealed ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <CopyButton value={value} label={`${label} copied!`} />
      </div>
    </div>
  );
}
