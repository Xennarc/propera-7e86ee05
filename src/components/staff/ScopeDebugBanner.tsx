import { useResortScope } from '@/hooks/sync/useResortScope';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ScopeDebugBannerProps {
  lastSyncedAt?: Date;
  dataCount?: number;
}

/**
 * Debug banner for staff request pages - only visible with ?debug=1 query param
 */
export function ScopeDebugBanner({ lastSyncedAt, dataCount }: ScopeDebugBannerProps) {
  const [searchParams] = useSearchParams();
  const showDebug = searchParams.get('debug') === '1';

  const { resortId, userId, isStaff, resort, resortRole, isSuperAdmin, scopeSource } = useResortScope();

  if (!showDebug) return null;

  const hasValidScope = !!resortId && isStaff;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-mono space-y-1">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
        <Info className="h-4 w-4" />
        <span>Scope Debug</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-1">
          {hasValidScope ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
          <span>Resort:</span>
          <span className="truncate max-w-32">{resort?.name || resortId?.slice(0, 8) || 'NONE'}</span>
        </div>
        
        <div>
          <span>User: </span>
          <span className="truncate">{userId?.slice(0, 8) || 'NONE'}</span>
        </div>
        
        <div>
          <span>Role: </span>
          <span>{isSuperAdmin ? 'SUPER_ADMIN' : resortRole || 'NONE'}</span>
        </div>
        
        <div>
          <span>Source: </span>
          <span>{scopeSource}</span>
        </div>
        
        <div>
          <span>isStaff: </span>
          <span className={isStaff ? 'text-green-600' : 'text-red-500'}>{String(isStaff)}</span>
        </div>
        
        <div>
          <span>Data: </span>
          <span>{dataCount ?? '-'} items</span>
        </div>
        
        {lastSyncedAt && (
          <div className="col-span-2">
            <span>Last sync: </span>
            <span>{format(lastSyncedAt, 'HH:mm:ss')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
