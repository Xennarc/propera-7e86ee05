import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Info, Calculator } from 'lucide-react';
import { PricingCharge, parsePricingCharges, calculatePriceBreakdown } from '@/lib/pricing-utils';
import { cn } from '@/lib/utils';

export default function ResortPricingPage() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  const [charges, setCharges] = useState<PricingCharge[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current resort pricing config
  const { data: resort, isLoading } = useQuery({
    queryKey: ['resort-pricing', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return null;
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, pricing_charges')
        .eq('id', currentResort.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentResort?.id,
  });

  // Initialize charges from database
  useEffect(() => {
    if (resort?.pricing_charges) {
      setCharges(parsePricingCharges(resort.pricing_charges));
      setHasChanges(false);
    }
  }, [resort]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentResort?.id) throw new Error('No resort selected');
      const { error } = await supabase
        .from('resorts')
        .update({ pricing_charges: JSON.stringify(charges) })
        .eq('id', currentResort.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resort-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['resort'] });
      toast.success('Pricing configuration saved');
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const updateCharge = (index: number, updates: Partial<PricingCharge>) => {
    const newCharges = [...charges];
    newCharges[index] = { ...newCharges[index], ...updates };
    setCharges(newCharges);
    setHasChanges(true);
  };

  const addCharge = () => {
    setCharges([
      ...charges,
      { name: 'New Charge', percentage: 0, apply_after_previous: true, is_active: true },
    ]);
    setHasChanges(true);
  };

  const removeCharge = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // Preview calculation with example amount
  const exampleAmount = 100;
  const breakdown = calculatePriceBreakdown(exampleAmount, charges);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pricing Configuration</h1>
        <p className="text-muted-foreground">
          Configure taxes and service charges for activity bookings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Charges Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Charges & Taxes
            </CardTitle>
            <CardDescription>
              Configure the charges applied to guest bookings. Charges are applied in order from top to bottom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {charges.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No charges configured. Guests will see base prices only.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((charge, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      charge.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    
                    <div className="flex-1 grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={charge.name}
                          onChange={(e) => updateCharge(index, { name: e.target.value })}
                          placeholder="Charge name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Percentage (%)</Label>
                        <NumericInput
                          min={0}
                          max={100}
                          value={charge.percentage}
                          onChange={(value) => updateCharge(index, { percentage: value })}
                          allowDecimal
                          defaultValue={0}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={charge.is_active}
                          onCheckedChange={(checked) => updateCharge(index, { is_active: checked })}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeCharge(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {charges.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Each charge can be applied on the base amount or on the running total (compounding). 
                  Toggle "Apply after previous" below to compound charges.
                </AlertDescription>
              </Alert>
            )}

            {charges.map((charge, index) => (
              index > 0 && (
                <div key={`compound-${index}`} className="flex items-center gap-2 ml-6 text-sm">
                  <Switch
                    id={`compound-${index}`}
                    checked={charge.apply_after_previous}
                    onCheckedChange={(checked) => updateCharge(index, { apply_after_previous: checked })}
                    disabled={!charge.is_active}
                  />
                  <Label htmlFor={`compound-${index}`} className="text-muted-foreground">
                    "{charge.name}" applies on total after previous charges
                  </Label>
                </div>
              )
            ))}

            <Button variant="outline" className="w-full" onClick={addCharge}>
              <Plus className="h-4 w-4 mr-2" />
              Add Charge
            </Button>

            {hasChanges && (
              <Button 
                className="w-full" 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              How pricing will appear to guests (example: ${exampleAmount.toFixed(2)} base)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base amount</span>
                <span>${breakdown.subtotal.toFixed(2)}</span>
              </div>
              
              {breakdown.charges.map((charge, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {charge.name} ({charge.percentage}%)
                  </span>
                  <span>${charge.amount.toFixed(2)}</span>
                </div>
              ))}
              
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-semibold text-lg">${breakdown.total.toFixed(2)}</span>
              </div>
              
              <p className="text-xs text-muted-foreground pt-2">
                Estimated total • Payment at resort
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
