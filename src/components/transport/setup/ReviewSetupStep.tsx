import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Car, 
  Users,
  Rocket,
  CheckCircle2,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransportStops } from '@/hooks/transport/useTransportStops';
import { useBuggies } from '@/hooks/transport/useBuggies';
import { useBuggyDrivers } from '@/hooks/transport/useBuggyDrivers';
import { motion } from 'framer-motion';

interface ReviewSetupStepProps {
  resortId: string | undefined;
  onComplete: () => void;
  isCompleting: boolean;
}

export function ReviewSetupStep({ resortId, onComplete, isCompleting }: ReviewSetupStepProps) {
  const { data: stops = [] } = useTransportStops(resortId);
  const { data: allBuggies = [] } = useBuggies(resortId);
  const { data: drivers = [] } = useBuggyDrivers(resortId);
  
  const buggies = allBuggies.filter(b => b.status !== 'out_of_service');
  const uniqueZones = [...new Set(stops.map(s => s.zone).filter(Boolean))];
  const totalCapacity = buggies.reduce((sum, b) => sum + b.capacity, 0);
  
  const stats = [
    {
      icon: MapPin,
      label: 'Stops',
      value: stops.length,
      detail: uniqueZones.length > 0 ? `across ${uniqueZones.length} zones` : 'configured',
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Car,
      label: 'Buggies',
      value: buggies.length,
      detail: `${totalCapacity} total seats`,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Users,
      label: 'Drivers',
      value: drivers.length,
      detail: 'registered',
      color: 'text-green-600',
      bg: 'bg-green-500/10',
    },
  ];
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4"
        >
          <PartyPopper className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.h3
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-semibold"
        >
          Ready to Launch!
        </motion.h3>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground mt-1"
        >
          Your transport system is configured and ready to go
        </motion.p>
      </div>
      
      {/* Stats grid */}
      <div className="grid gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border',
              stat.bg
            )}
          >
            <div className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center',
              'bg-background shadow-sm'
            )}>
              <stat.icon className={cn('h-6 w-6', stat.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{stat.detail}</p>
            </div>
            <CheckCircle2 className={cn('h-5 w-5', stat.color)} />
          </motion.div>
        ))}
      </div>
      
      {/* Complete button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-auto"
      >
        <Button
          onClick={onComplete}
          disabled={isCompleting}
          className="w-full h-12 text-base font-medium"
          size="lg"
        >
          {isCompleting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Completing Setup...
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 mr-2" />
              Start Dispatching
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-3">
          You can always add more resources from the Settings page
        </p>
      </motion.div>
    </div>
  );
}
