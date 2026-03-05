import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

  return (
    <div className="flex items-start gap-4 pb-4 border-b border-border/40">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div>
          <h3 className="font-semibold text-base leading-tight truncate">{displayName}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {user.username && user.full_name ? `@${user.username}` : ''}
            {resortName ? ` · ${resortName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {roleName && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              {roleName}
            </Badge>
          )}
          {hasOverrides ? (
            <Badge variant="info" className="text-xs">
              {customizedCount} customized {customizedCount === 1 ? 'module' : 'modules'}
            </Badge>
          ) : (
            <Badge variant="subtle" className="text-xs">
              Inherited from role
            </Badge>
          )}
          {totalModules > 0 && inheritedCount === totalModules && (
            <Badge variant="success" className="text-xs">
              100% role defaults
            </Badge>
          )}
        </div>
        {/* Last changed context */}
        {lastChangedAt && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            <span>
              Last modified {formatDistanceToNow(new Date(lastChangedAt), { addSuffix: true })}
              {lastChangedBy && ` by ${lastChangedBy}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
