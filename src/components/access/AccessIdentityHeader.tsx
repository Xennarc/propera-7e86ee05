import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AccessIdentityHeaderProps {
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    email?: string;
  };
  resortName?: string;
  roleName?: string;
  customizedCount: number;
  hasOverrides: boolean;
  totalModules?: number;
  inheritedCount?: number;
  lastChangedAt?: string | null;
  lastChangedBy?: string | null;
}

export function AccessIdentityHeader({
  user,
  resortName,
  roleName,
  customizedCount,
  hasOverrides,
  totalModules = 0,
  inheritedCount = 0,
  lastChangedAt,
  lastChangedBy,
}: AccessIdentityHeaderProps) {
  const displayName = user.full_name || user.username || user.email || 'Unknown';
  const initials = displayName.slice(0, 2).toUpperCase();
  const inheritPct = totalModules > 0 ? Math.round((inheritedCount / totalModules) * 100) : 100;

  return (
    <div className="flex items-start gap-3.5 pb-4 border-b border-border/40">
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <h3 className="font-semibold text-sm leading-tight truncate">{displayName}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {user.username && user.full_name ? `@${user.username}` : ''}
            {resortName ? ` · ${resortName}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {roleName && (
            <Badge variant="outline" className="text-[11px] gap-1">
              <Shield className="h-3 w-3" />
              {roleName}
            </Badge>
          )}
          {hasOverrides ? (
            <Badge variant="info" className="text-[11px]">
              {customizedCount} custom
            </Badge>
          ) : (
            <Badge variant="subtle" className="text-[11px]">
              All inherited
            </Badge>
          )}
          {totalModules > 0 && (
            <Badge variant={inheritPct === 100 ? 'success' : 'subtle'} className="text-[11px] tabular-nums">
              {inheritPct}% defaults
            </Badge>
          )}
        </div>

        {/* Last changed context */}
        {lastChangedAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>
              Modified {formatDistanceToNow(new Date(lastChangedAt), { addSuffix: true })}
              {lastChangedBy && ` by ${lastChangedBy}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
