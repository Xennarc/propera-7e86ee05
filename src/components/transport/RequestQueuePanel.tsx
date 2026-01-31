import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Plus,
  Inbox,
  Accessibility,
  Star,
  Clock,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { RequestQueueCard } from './RequestQueueCard';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

interface RequestQueuePanelProps {
  requests: TransportQueueRequest[];
  isLoading: boolean;
  onCreateTrip: (requestIds: string[]) => void;
  onCancelRequest: (requestId: string) => void;
  isCreatingTrip: boolean;
}

type FilterType = 'all' | 'on_demand' | 'scheduled' | 'vip' | 'accessible';

export function RequestQueuePanel({
  requests,
  isLoading,
  onCreateTrip,
  onCancelRequest,
  isCreatingTrip,
}: RequestQueuePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // Sub-feature flag for staff dispatch actions
  const dispatchEnabled = useFeatureEnabled('enable_requests_staff_dispatch');
  
  // Filter and search requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;
    
    // Apply filter
    switch (activeFilter) {
      case 'on_demand':
        filtered = filtered.filter(r => r.request_type === 'on_demand');
        break;
      case 'scheduled':
        filtered = filtered.filter(r => r.request_type === 'scheduled');
        break;
      case 'vip':
        filtered = filtered.filter(r => r.priority === 'vip' || r.priority === 'high');
        break;
      case 'accessible':
        filtered = filtered.filter(r => r.needs_accessible);
        break;
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.guest_name?.toLowerCase().includes(q) ||
        r.room_number?.toLowerCase().includes(q) ||
        r.pickup_stop?.name?.toLowerCase().includes(q) ||
        r.dropoff_stop?.name?.toLowerCase().includes(q)
      );
    }
    
    // Sort: VIP first, then by creation time
    return [...filtered].sort((a, b) => {
      const priorityOrder = { vip: 0, high: 1, normal: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requests, activeFilter, searchQuery]);
  
  const toggleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };
  
  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(filteredRequests.map(r => r.id)));
  };
  
  const handleCreateTrip = () => {
    if (selectedIds.size > 0) {
      onCreateTrip(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };
  
  // Count badges
  const counts = useMemo(() => ({
    vip: requests.filter(r => r.priority === 'vip' || r.priority === 'high').length,
    accessible: requests.filter(r => r.needs_accessible).length,
    scheduled: requests.filter(r => r.request_type === 'scheduled').length,
  }), [requests]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Request Queue</h2>
          <Badge variant="secondary" className="tabular-nums">
            {requests.length}
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, room, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            className="h-8"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'vip' ? 'default' : 'outline'}
            className="h-8"
            onClick={() => setActiveFilter('vip')}
          >
            <Star className="h-3.5 w-3.5 mr-1" />
            VIP
            {counts.vip > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {counts.vip}
              </Badge>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'scheduled' ? 'default' : 'outline'}
            className="h-8"
            onClick={() => setActiveFilter('scheduled')}
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Scheduled
          </Button>
          <Button
            size="sm"
            variant={activeFilter === 'accessible' ? 'default' : 'outline'}
            className="h-8"
            onClick={() => setActiveFilter('accessible')}
          >
            <Accessibility className="h-3.5 w-3.5 mr-1" />
            Accessible
          </Button>
        </div>
        
        {/* Selection mode toggle - gated by dispatch flag */}
        {dispatchEnabled ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={selectionMode ? 'secondary' : 'outline'}
              className="h-9"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {selectedIds.size} selected
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Select Multiple
                </>
              )}
            </Button>
            
            {selectionMode && (
              <>
                <Button size="sm" variant="ghost" onClick={selectAll} className="h-9">
                  Select All
                </Button>
                <Button 
                  size="sm"
                  disabled={selectedIds.size === 0 || isCreatingTrip}
                  onClick={handleCreateTrip}
                  className="h-9 ml-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Trip ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Staff dispatch actions disabled</span>
          </div>
        )}
      </div>
      
      {/* Request list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No requests</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'No requests match your search' : 'All caught up! No pending requests.'}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((request) => (
                <RequestQueueCard
                  key={request.id}
                  request={request}
                  isSelected={selectedIds.has(request.id)}
                  onSelect={(selected) => toggleSelect(request.id, selected)}
                  onCancel={() => onCancelRequest(request.id)}
                  selectionMode={selectionMode}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
