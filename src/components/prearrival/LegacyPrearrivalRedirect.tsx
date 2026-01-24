import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Displayed when a user tries to access deprecated /prearrival/* routes
 * after the legacy system has been fully removed.
 */
export function LegacyPrearrivalRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <Card className="border-amber-200 dark:border-amber-800/50 shadow-lg">
          <CardContent className="py-10 px-6 text-center space-y-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto"
            >
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </motion.div>

            {/* Title and message */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold">This link format has been updated</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We've upgraded our pre-arrival system for a better experience. 
                Please use the new link sent to your email, or log in using 
                your room number and PIN.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => window.location.href = '/guest/login'}
                className="w-full"
                size="lg"
              >
                Go to Guest Login
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>Need help? Contact the resort directly.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <a href="https://propera.cc" className="hover:underline">Propera</a>
        </p>
      </motion.div>
    </div>
  );
}
