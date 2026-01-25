import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LegacyTokenRedirectProps {
  title?: string;
  message?: string;
  helpText?: string;
}

/**
 * Displayed when a user tries to access deprecated token-based login routes.
 * Guides users to the standard PIN-based login page.
 */
export function LegacyTokenRedirect({
  title = "This link format has been updated",
  message = "We've upgraded our login system for better security. Please log in using your room number, last name, and PIN.",
  helpText = "Need help? Contact the resort directly.",
}: LegacyTokenRedirectProps) {
  const handleGoToLogin = () => {
    window.location.href = '/guest/find';
  };

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

            {/* Content */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {message}
              </p>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleGoToLogin} 
              className="w-full"
              size="lg"
            >
              Go to Guest Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {/* Help text */}
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <HelpCircle className="h-3 w-3" />
              {helpText}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
