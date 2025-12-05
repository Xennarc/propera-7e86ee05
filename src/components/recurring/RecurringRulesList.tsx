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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, Play, Pause, RefreshCw, Pencil, Loader2 } from 'lucide-react';

interface RecurringRulesListProps {
  rules: (ActivityRecurringRule | RestaurantRecurringRule)[];
  type: 'activity' | 'restaurant';
  onEdit: (rule: ActivityRecurringRule | RestaurantRecurringRule) => void;
  onRefresh: () => void;
}

export function RecurringRulesList({ rules, type, onEdit, onRefresh }: RecurringRulesListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
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

  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No recurring schedules yet. Add one to auto-generate {type === 'activity' ? 'sessions' : 'time slots'}.
      </p>
    );
  }

  return (
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
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
