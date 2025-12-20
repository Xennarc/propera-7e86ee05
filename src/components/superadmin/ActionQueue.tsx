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
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap,
  RefreshCw,
  Eye,
  Settings,
  Calendar,
  Utensils,
  Mail,
  X,
} from 'lucide-react';

export interface ActionQueueItem {
  id: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  resort?: string;
  resortId?: string;
  category: 'config' | 'data' | 'invite' | 'error';
  triggeredAt: Date;
  fixAction?: {
    label: string;
    type: 'navigate' | 'api' | 'dialog';
    target?: string;
  };
  relatedEvents?: { action: string; timestamp: Date }[];
}

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading?: boolean;
  onItemFix?: (item: ActionQueueItem) => void;
}

// Severity Badge Component
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

export function ActionQueue({ items, loading, onItemFix }: ActionQueueProps) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<ActionQueueItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleFix = (item: ActionQueueItem) => {
    if (item.fixAction) {
      if (item.fixAction.type === 'navigate' && item.fixAction.target) {
        navigate(item.fixAction.target);
      } else if (item.fixAction.type === 'api') {
        // Would call API here
        toast.success(`Action triggered: ${item.fixAction.label}`);
        onItemFix?.(item);
      } else if (item.fixAction.type === 'dialog') {
        setSelectedItem(item);
        setDetailsOpen(true);
      }
    }
  };

  const handleOpenDetails = (item: ActionQueueItem) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const getCategoryIcon = (category: ActionQueueItem['category']) => {
    switch (category) {
      case 'config': return Settings;
      case 'data': return Calendar;
      case 'invite': return Mail;
      case 'error': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  return (
    <>
      <Card className="border-warning/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <CardTitle>Action Queue</CardTitle>
            </div>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              {items.length} pending
            </Badge>
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
                      className="group p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border transition-all"
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
                          {item.resort && (
                            <Badge variant="outline" className="mt-2 text-[10px]">
                              {item.resort}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.fixAction && (
                            <Button 
                              variant="default" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleFix(item)}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              {item.fixAction.label}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleOpenDetails(item)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Details
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

                {/* Related Events */}
                {selectedItem.relatedEvents && selectedItem.relatedEvents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Related Events</h4>
                    <div className="space-y-2">
                      {selectedItem.relatedEvents.map((event, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-lg">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span>{event.action}</span>
                        </div>
                      ))}
                    </div>
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
                  {selectedItem.resortId && (
                    <Button 
                      variant="outline" 
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
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
