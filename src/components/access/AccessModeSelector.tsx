import { cn } from '@/lib/utils';
import { Lock, Sliders } from 'lucide-react';

export type AccessMode = 'role-defaults' | 'customize';

interface AccessModeSelectorProps {
  mode: AccessMode;
  onChange: (mode: AccessMode) => void;
  disabled?: boolean;
}

export function AccessModeSelector({ mode, onChange, disabled }: AccessModeSelectorProps) {
  const options: { value: AccessMode; label: string; description: string; icon: typeof Lock }[] = [
    {
      value: 'role-defaults',
      label: 'Use role defaults',
      description: 'Access inherited from assigned roles',
      icon: Lock,
    },
    {
      value: 'customize',
      label: 'Customize access',
      description: 'Override module permissions individually',
      icon: Sliders,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 py-3">
      {options.map(opt => {
        const Icon = opt.icon;
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
              'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isActive
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/40 bg-transparent',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-sm font-medium', isActive && 'text-primary')}>{opt.label}</span>
            </div>
            <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
