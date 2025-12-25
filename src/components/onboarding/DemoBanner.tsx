import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export function DemoBanner() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (currentResort?.is_demo) {
      loadDemoExpiry();
    }
  }, [currentResort?.id, currentResort?.is_demo]);

  const loadDemoExpiry = async () => {
    if (!currentResort?.id) return;

    const { data } = await supabase
      .from('demo_tenants')
      .select('expires_at')
      .eq('tenant_id', currentResort.id)
      .eq('is_converted', false)
      .single();

    if (data?.expires_at) {
      const days = differenceInDays(parseISO(data.expires_at), new Date());
      setDaysRemaining(Math.max(0, days));
    }
  };

  // Don't show for non-demo resorts
  if (!currentResort?.is_demo || dismissed) return null;

  const isUrgent = daysRemaining !== null && daysRemaining <= 3;

  return (
    <div className={`relative py-2.5 px-4 ${isUrgent ? 'bg-destructive/10 border-b border-destructive/20' : 'bg-primary/10 border-b border-primary/20'}`}>
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${isUrgent ? 'border-destructive text-destructive' : 'border-primary text-primary'} gap-1`}>
            <Sparkles className="h-3 w-3" />
            Demo Mode
          </Badge>
          <span className="text-sm">
            {daysRemaining !== null ? (
              <>
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                {daysRemaining === 0 ? 'Expires today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
              </>
            ) : (
              'Explore Propera with sample data'
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isUrgent ? "destructive" : "default"}
            onClick={() => navigate('/staff/onboarding')}
          >
            View Checklist
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
