import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface ExpiredLinkScreenProps {
  resortBranding?: {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  } | null;
  message?: string;
  title?: string;
  variant?: 'expired' | 'not_found' | 'error';
}

export function ExpiredLinkScreen({
  resortBranding,
  message = 'This link has expired or is no longer available.',
  title = 'Link Unavailable',
  variant = 'expired',
}: ExpiredLinkScreenProps) {
  const navigate = useNavigate();

  const icons = {
    expired: Clock,
    not_found: AlertCircle,
    error: AlertCircle,
  };

  const Icon = icons[variant];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <Card className="border-border/50 shadow-lg">
          <CardContent className="py-10 px-6 text-center space-y-6">
            {/* Resort branding */}
            {resortBranding?.logo_url && (
              <img
                src={resortBranding.logo_url}
                alt={resortBranding.name || 'Resort'}
                className="h-10 w-auto mx-auto mb-2"
              />
            )}

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto"
            >
              <Icon className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </motion.div>

            {/* Title and message */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate('/guest/login')}
                className="w-full"
              >
                Use Room Number & PIN
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground">
                Or contact the resort to request a new pre-arrival link.
              </p>
            </div>

            {/* Resort name footer */}
            {resortBranding?.name && (
              <p className="text-xs text-muted-foreground pt-4 border-t">
                {resortBranding.name}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
