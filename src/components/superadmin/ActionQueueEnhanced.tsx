import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  Zap,
  Eye,
  Settings,
  Calendar,
  Utensils,
  Mail,
  AlertCircle,
  Database,
  ArrowUpCircle,
  Clock,
} from 'lucide-react';
import type { ActionQueueItem } from '@/hooks/useActionQueueDetectors';

interface ActionQueueEnhancedProps {
  items: ActionQueueItem[];
  loading?: boolean;
  filter?: 'all' | 'P0';
  onFilterChange?: (filter: 'all' | 'P0') => void;
  onItemFix?: (item: ActionQueueItem) => void;
  onItemEscalate?: (item: ActionQueueItem) => void;
}

// Severity Badge Component with incident-like styling
function SeverityBadge({ level }: { level: 'P0' | 'P1' | 'P2' | 'P3' }) {
  const styles = {
    P0: 'bg-destructive/15 text-destructive border-destructive/30 animate-pulse',
    P1: 'bg-warning/15 text-warning border-warning/30',
    P2: 'bg-info/15 text-info border-info/30',
    P3: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${styles[level]}`}>
      {level}
    </Badge>
  );
}

// Get incident-like row styling based on severity
function getRowStyle(severity: 'P0' | 'P1' | 'P2' | 'P3') {
  switch (severity) {
    case 'P0':
      return 'border-l-4 border-l-destructive bg-destructive/5 hover:bg-destructive/10';
    case 'P1':
      return 'border-l-4 border-l-warning bg-warning/5 hover:bg-warning/10';
    case 'P2':
      return 'border-l-4 border-l-info bg-info/5 hover:bg-info/10';
    default:
      return 'border-l-4 border-l-muted-foreground/30 hover:bg-muted/30';
  }
}

export function ActionQueueEnhanced({ 
  items, 
  loading, 
  filter = 'all', 
  onFilterChange, 
  onItemFix,
  onItemEscalate,
}: ActionQueueEnhancedProps) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<ActionQueueItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleFix = (item: ActionQueueItem) => {
    if (item.fixAction) {
      if (item.fixAction.type === 'navigate' && item.fixAction.target) {
        navigate(item.fixAction.target);
      } else if (item.fixAction.type === 'api') {
        toast.success(`Action triggered: ${item.fixAction.label}`);
        onItemFix?.(item);
      } else if (item.fixAction.type === 'dialog') {
        setSelectedItem(item);
        setDetailsOpen(true);
      }
    }
  };

  const handleEscalate = (item: ActionQueueItem) => {
    toast.info(`Escalating: ${item.title}`);
    onItemEscalate?.(item);
  };

  const handleOpenDetails = (item: ActionQueueItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const getCategoryIcon = (category: ActionQueueItem['category']) => {
    switch (category) {
      case 'config': return Settings;
      case 'data': return Database;
      case 'invite': return Mail;
      case 'error': return AlertCircle;
      default: return AlertTriangle;
    }
  };

  // Count P0 items for badge
  const p0Count = items.filter(i => i.severity === 'P0').length;

  return (
    <>
      <Card className="border-warning/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <CardTitle>Action Queue</CardTitle>
              {p0Count > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {p0Count} Critical
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onFilterChange && (
                <Select value={filter} onValueChange={(v) => onFilterChange(v as 'all' | 'P0')}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({items.length})</SelectItem>
                    <SelectItem value="P0">P0 Only ({p0Count})</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {items.length} pending
              </Badge>
            </div>
          </div>
          <CardDescription>Issues that need your attention with quick fix actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : items.length > 0 ? (
            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const CategoryIcon = getCategoryIcon(item.category);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group p-4 rounded-xl border border-border/50 transition-all',
                        getRowStyle(item.severity)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <SeverityBadge level={item.severity} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-sm">{item.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {item.resort && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.resort}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Just now
                            </span>
                          </div>
                        </div>
                        
                        {/* Action Buttons - Always visible on hover */}
                        <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {item.fixAction && (
                            <Button 
                              variant="default" 
                              size="sm"
                              className="h-8 text-xs px-3"
                              onClick={() => handleFix(item)}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => handleEscalate(item)}
                          >
                            <ArrowUpCircle className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => handleOpenDetails(item)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
              <p className="font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground">No pending actions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent>
          {selectedItem && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SeverityBadge level={selectedItem.severity} />
                  <SheetTitle>{selectedItem.title}</SheetTitle>
                </div>
                <SheetDescription>{selectedItem.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* What triggered this */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">What triggered this</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.category === 'config' && 'Configuration mismatch detected during health check'}
                    {selectedItem.category === 'data' && 'Missing or incomplete data detected'}
                    {selectedItem.category === 'invite' && 'Pending invitation requires attention'}
                    {selectedItem.category === 'error' && 'Error occurred during user action'}
                  </p>
                </div>

                {/* Affected */}
                {selectedItem.resort && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Affected Resort</h4>
                    <Badge variant="outline">{selectedItem.resort}</Badge>
                  </div>
                )}

                {/* Suggested Next Step */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Suggested Next Step</h4>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-sm">
                      {selectedItem.fixAction?.label || 'Review and resolve manually'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedItem.fixAction && (
                    <Button className="flex-1" onClick={() => handleFix(selectedItem)}>
                      <Zap className="h-4 w-4 mr-2" />
                      {selectedItem.fixAction.label}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => handleEscalate(selectedItem)}
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                </div>

                {selectedItem.resortId && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      navigate(`/superadmin/support`);
                      setDetailsOpen(false);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Support Mode
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
