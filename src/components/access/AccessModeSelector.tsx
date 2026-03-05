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
      label: 'Role defaults',
      description: 'Inherited from role',
      icon: Lock,
    },
    {
      value: 'customize',
      label: 'Customize',
      description: 'Override individually',
      icon: Sliders,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
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
              'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 min-h-[52px]',
              'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isActive
                ? 'border-primary/40 bg-primary/5 shadow-sm'
                : 'border-border/40 bg-transparent hover:bg-accent/30',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
              isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className={cn('text-sm font-medium block leading-tight', isActive && 'text-primary')}>{opt.label}</span>
              <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">{opt.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
