import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  Clock, 
  Accessibility, 
  Star,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

interface RequestQueueCardProps {
  request: TransportQueueRequest;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onCancel: () => void;
  selectionMode: boolean;
}

const priorityConfig = {
  vip: { label: 'VIP', className: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  high: { label: 'High', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground border-border' },
};

const statusConfig = {
  requested: { label: 'New', className: 'bg-blue-500/20 text-blue-600' },
  queued: { label: 'Queued', className: 'bg-purple-500/20 text-purple-600' },
  assigned_to_trip: { label: 'In Trip', className: 'bg-green-500/20 text-green-600' },
};

const typeConfig = {
  on_demand: { label: 'On Demand', icon: null },
  scheduled: { label: 'Scheduled', icon: Clock },
  fixed_route: { label: 'Route', icon: null },
};

export function RequestQueueCard({
  request,
  isSelected,
  onSelect,
  onCancel,
  selectionMode,
}: RequestQueueCardProps) {
  const priority = priorityConfig[request.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.requested;
  const type = typeConfig[request.request_type as keyof typeof typeConfig] || typeConfig.on_demand;
  
  const pickupName = request.pickup_stop?.name || request.pickup_text || 'Unknown';
  const dropoffName = request.dropoff_stop?.name || request.dropoff_text || 'Unknown';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'rounded-xl border bg-card p-4 transition-all duration-200',
        isSelected && 'ring-2 ring-primary border-primary',
        selectionMode && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={() => selectionMode && onSelect(!isSelected)}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-0.5"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {request.priority !== 'normal' && (
              <Badge variant="outline" className={cn('text-xs', priority.className)}>
                {request.priority === 'vip' && <Star className="h-3 w-3 mr-1" />}
                {priority.label}
              </Badge>
            )}
            <Badge variant="secondary" className={cn('text-xs', status.className)}>
              {status.label}
            </Badge>
            {request.needs_accessible && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                <Accessibility className="h-3 w-3 mr-1" />
                Accessible
              </Badge>
            )}
          </div>
          
          <div className="text-sm font-medium truncate">
            {request.guest_name || 'Guest'} • Room {request.room_number || '—'}
          </div>
        </div>
        
        {!selectionMode && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Route info */}
      <div className="flex items-center gap-2 text-sm mb-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <span className="truncate">{pickupName}</span>
        </div>
        <span className="text-muted-foreground shrink-0">→</span>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="truncate">{dropoffName}</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {request.party_size}
          </span>
          <span>{type.label}</span>
        </div>
        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
      </div>
    </motion.div>
  );
}
