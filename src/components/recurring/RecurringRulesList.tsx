import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityRecurringRule, RestaurantRecurringRule } from '@/types/database';
import { formatRuleSummary, generateActivitySessions, generateRestaurantSlots } from '@/lib/recurring-schedule';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, Play, Pause, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface RecurringRulesListProps {
  rules: (ActivityRecurringRule | RestaurantRecurringRule)[];
  type: 'activity' | 'restaurant';
  onEdit: (rule: ActivityRecurringRule | RestaurantRecurringRule) => void;
  onRefresh: () => void;
}

export function RecurringRulesList({ rules, type, onEdit, onRefresh }: RecurringRulesListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ActivityRecurringRule | RestaurantRecurringRule | null>(null);
  const [deleteFutureSessions, setDeleteFutureSessions] = useState(true);
  const { toast } = useToast();

  const toggleActive = async (rule: ActivityRecurringRule | RestaurantRecurringRule) => {
    setLoadingId(rule.id);
    const table = type === 'activity' ? 'activity_recurring_rules' : 'restaurant_recurring_rules';
    
    const { error } = await supabase
      .from(table)
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: `Schedule ${rule.is_active ? 'deactivated' : 'activated'}` });
      onRefresh();
    }
    setLoadingId(null);
  };

  const regenerate = async (rule: ActivityRecurringRule | RestaurantRecurringRule) => {
    setLoadingId(rule.id);
    try {
      let result;
      if (type === 'activity') {
        result = await generateActivitySessions(rule as ActivityRecurringRule);
      } else {
        result = await generateRestaurantSlots(rule as RestaurantRecurringRule);
      }
      toast({
        title: 'Regenerated',
        description: `Created ${result.created} new ${type === 'activity' ? 'sessions' : 'slots'}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ''}.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setLoadingId(null);
  };

  const handleDeleteClick = (rule: ActivityRecurringRule | RestaurantRecurringRule) => {
    setRuleToDelete(rule);
    setDeleteFutureSessions(true);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;
    
    setLoadingId(ruleToDelete.id);
    setDeleteDialogOpen(false);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Delete future sessions/slots if requested
      if (deleteFutureSessions) {
        if (type === 'activity') {
          const activityRule = ruleToDelete as ActivityRecurringRule;
          const { error: sessionsError } = await supabase
            .from('activity_sessions')
            .delete()
            .eq('activity_id', activityRule.activity_id)
            .eq('start_time', activityRule.start_time)
            .eq('end_time', activityRule.end_time)
            .gte('date', today);
          
          if (sessionsError) throw sessionsError;
        } else {
          const restaurantRule = ruleToDelete as RestaurantRecurringRule;
          const { error: slotsError } = await supabase
            .from('restaurant_time_slots')
            .delete()
            .eq('restaurant_id', restaurantRule.restaurant_id)
            .eq('start_time', restaurantRule.start_time)
            .eq('end_time', restaurantRule.end_time)
            .eq('meal_period', restaurantRule.meal_period)
            .gte('date', today);
          
          if (slotsError) throw slotsError;
        }
      }
      
      // Delete the recurring rule
      const table = type === 'activity' ? 'activity_recurring_rules' : 'restaurant_recurring_rules';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', ruleToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: 'Deleted',
        description: deleteFutureSessions 
          ? `Schedule and future ${type === 'activity' ? 'sessions' : 'slots'} deleted.`
          : 'Schedule deleted.',
      });
      onRefresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoadingId(null);
      setRuleToDelete(null);
    }
  };

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No recurring schedules yet. Add one to auto-generate {type === 'activity' ? 'sessions' : 'time slots'}.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {rules.map((rule) => (
          <Card key={rule.id} className="bg-muted/30">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {formatRuleSummary(
                    rule.frequency,
                    rule.days_of_week,
                    rule.start_time,
                    rule.start_date,
                    rule.end_date,
                    rule.capacity
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {type === 'restaurant' && 'meal_period' in rule && (
                    <Badge variant="outline" className="text-xs">
                      {(rule as RestaurantRecurringRule).meal_period}
                    </Badge>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={loadingId === rule.id}>
                    {loadingId === rule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(rule)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => regenerate(rule)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Future
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleActive(rule)}>
                    {rule.is_active ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteClick(rule)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-start space-x-3 py-4">
            <Checkbox
              id="delete-future"
              checked={deleteFutureSessions}
              onCheckedChange={(checked) => setDeleteFutureSessions(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="delete-future" className="font-medium cursor-pointer">
                Also delete future {type === 'activity' ? 'sessions' : 'slots'}
              </Label>
              <p className="text-sm text-muted-foreground">
                Delete all future {type === 'activity' ? 'sessions' : 'slots'} that match this schedule's time pattern (from today onwards).
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
