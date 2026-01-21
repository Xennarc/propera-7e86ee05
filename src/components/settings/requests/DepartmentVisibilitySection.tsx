import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Users, UserCheck, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRetentionPolicy, useRetentionPolicyMutation } from '@/hooks/useRequestsSettings';

interface Props {
  resortId: string;
}

export function DepartmentVisibilitySection({ resortId }: Props) {
  const { toast } = useToast();
  const { data: policy, isLoading } = useRetentionPolicy(resortId);
  const mutation = useRetentionPolicyMutation(resortId);
  
  const [visibility, setVisibility] = useState<'ASSIGNED_ONLY' | 'DEPARTMENT_QUEUE'>('ASSIGNED_ONLY');

  useEffect(() => {
    if (policy) {
      setVisibility(policy.department_visibility_policy as 'ASSIGNED_ONLY' | 'DEPARTMENT_QUEUE');
    }
  }, [policy]);

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ department_visibility_policy: visibility });
      toast({ title: 'Visibility policy saved' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error saving policy', description: (err as Error).message });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This setting controls what <strong>LINE staff</strong> (non-supervisors/managers) can see in their request inbox.
          Supervisors and managers always see the full department queue regardless of this setting.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Department Visibility Policy
          </CardTitle>
          <CardDescription>
            Control what requests LINE staff can see in their inbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
            <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="ASSIGNED_ONLY" id="assigned" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="assigned" className="flex items-center gap-2 cursor-pointer font-medium">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Assigned Only
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  LINE staff only see requests that are specifically assigned to them. 
                  This is more focused but requires supervisors to assign each request.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="DEPARTMENT_QUEUE" id="queue" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="queue" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Department Queue
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  LINE staff can see all unassigned requests in their department's queue.
                  This allows staff to self-assign and pick up requests proactively.
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {mutation.isPending ? 'Saving...' : 'Save Visibility Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Future enhancement note */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-sm font-medium">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per-department visibility overrides will allow you to set different visibility policies
            for each department. For example, Housekeeping could use "Department Queue" while
            Engineering uses "Assigned Only".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
