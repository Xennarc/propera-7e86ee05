import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Lock, Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconActivities, IconRestaurants } from '@/components/icons/ProperaIcons';
import { format, parseISO } from 'date-fns';

interface PrearrivalRequestsBlockedStateProps {
  checkInDate: string;
  daysUntilArrival: number;
}

export function PrearrivalRequestsBlockedState({ 
  checkInDate, 
  daysUntilArrival 
}: PrearrivalRequestsBlockedStateProps) {
  const formattedDate = format(parseISO(checkInDate), 'EEEE, MMM d');
  
  return (
    <div className="space-y-6 pb-24">
      <motion.div 
        className="flex flex-col items-center text-center pt-8 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Icon with lock overlay */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Lock className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          Requests Available After Check-in
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Service requests like room service, towels, and housekeeping will be available once you've checked in to your room.
        </p>
      </motion.div>

      {/* Check-in countdown card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Check-in: {formattedDate}
                </p>
                <p className="text-sm text-muted-foreground">
                  {daysUntilArrival === 1 
                    ? 'Tomorrow!' 
                    : `${daysUntilArrival} days from now`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* What you can do instead */}
      <motion.div 
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <p className="text-sm font-medium text-foreground text-center">
          In the meantime, you can:
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2" 
            asChild
          >
            <Link to="/guest/activities">
              <IconActivities className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Pre-book Activities</span>
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2" 
            asChild
          >
            <Link to="/guest/activities?tab=dining">
              <IconRestaurants className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Reserve Dining</span>
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Return to home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="pt-4"
      >
        <Button variant="ghost" className="w-full gap-2" asChild>
          <Link to="/guest">
            View your stay details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
