import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleAccessState } from '@/hooks/useModulePermissions';
import {
  Globe, Users, ClipboardList, MessageSquare, Award, Bell,
  Activity, UtensilsCrossed, Bus, Brush, BarChart3,
  ShieldCheck, Settings, CreditCard, Plug, ShieldAlert, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Users, ClipboardList, MessageSquare, Award, Bell,
  Activity, UtensilsCrossed, Bus, Brush, BarChart3,
  ShieldCheck, Settings, CreditCard, Plug, ShieldAlert, AlertTriangle,
};

const ACCESS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  full: { label: 'Full', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  none: { label: 'None', variant: 'secondary' },
};

const INHERIT_CONFIG: Record<string, { label: string; variant: 'subtle' | 'info' | 'destructive' | 'outline' }> = {
  inherited: { label: 'Inherited', variant: 'subtle' },
  customized: { label: 'Custom', variant: 'info' },
};

interface ModuleAccessCardProps {
  state: ModuleAccessState;
  readOnly?: boolean;
}

export function ModuleAccessCard({ state, readOnly }: ModuleAccessCardProps) {
  const { module: mod, access, inheritance, canGrant } = state;
  const Icon = ICON_MAP[mod.icon] || Globe;
  const accessCfg = ACCESS_CONFIG[access];
  const inheritCfg = INHERIT_CONFIG[inheritance];
  const isEmpty = mod.permissionKeys.length === 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        'hover:bg-accent/30',
        isEmpty && 'opacity-50',
        !canGrant && !readOnly && 'opacity-60',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        access === 'full' ? 'bg-success/10 text-success' :
        access === 'partial' ? 'bg-warning/10 text-warning' :
        'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{mod.label}</p>
        <p className="text-xs text-muted-foreground leading-snug truncate">{mod.description}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Badge variant={accessCfg.variant} className="text-[10px] px-1.5 py-0">
          {accessCfg.label}
        </Badge>
        <Badge variant={inheritCfg.variant} className="text-[10px] px-1.5 py-0">
          {inheritCfg.label}
        </Badge>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
    </div>
  );
}
