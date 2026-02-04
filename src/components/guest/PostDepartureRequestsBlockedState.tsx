import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarCheck, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';

interface PostDepartureRequestsBlockedStateProps {
  checkOutDate: string;
  daysSinceDeparture: number;
}

export function PostDepartureRequestsBlockedState({ 
  checkOutDate, 
  daysSinceDeparture 
}: PostDepartureRequestsBlockedStateProps) {
  const formattedDate = format(parseISO(checkOutDate), 'EEEE, MMM d');
  
  return (
    <div className="space-y-6 pb-24">
      <motion.div 
        className="flex flex-col items-center text-center pt-8 pb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Icon with home overlay */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-foreground mb-2">
          Your Stay Has Ended
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Service requests are no longer available after checkout. We hope you had a wonderful stay!
        </p>
      </motion.div>

      {/* Checkout info card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="bg-muted/50 border-muted">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Checked out: {formattedDate}
                </p>
                <p className="text-sm text-muted-foreground">
                  {daysSinceDeparture === 1 
                    ? 'Yesterday' 
                    : `${daysSinceDeparture} days ago`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Return to home */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="pt-4"
      >
        <Button variant="ghost" className="w-full gap-2" asChild>
          <Link to="/guest">
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
