/**
 * GuestAccessGate Component
 * 
 * Blocks guest portal access when the danger flag `disable_guest_access` is enabled.
 * Provides a clear message to guests that the portal is temporarily unavailable.
 */

import { useFeatureEnabled } from '@/components/FeatureGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Phone, Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GuestAccessGateProps {
  children: React.ReactNode;
  resortName?: string;
}

export function GuestAccessGate({ children, resortName }: GuestAccessGateProps) {
  const navigate = useNavigate();
  
  // Check the danger flag - if TRUE, access is BLOCKED
  const guestAccessDisabled = useFeatureEnabled('disable_guest_access');

  // If the flag is enabled (true), block access
  if (guestAccessDisabled) {
    return (
      <div className={cn(
        "flex items-center justify-center min-h-[70vh] p-4 sm:p-6",
        "guest-page-bg"
      )}>
        <Card className={cn(
          "w-full max-w-md relative overflow-hidden",
          "border-border/50 shadow-xl",
          "bg-gradient-to-br from-card/95 via-card to-card/90",
          "backdrop-blur-xl"
        )}>
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-warning/3 pointer-events-none" />
          
          {/* Subtle glow effect at top */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-warning/10 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="relative text-center pb-2">
            {/* Icon container with premium styling */}
            <div className="mx-auto mb-4 relative">
              <div className={cn(
                "h-20 w-20 rounded-3xl flex items-center justify-center",
                "bg-gradient-to-br from-warning/20 to-warning/10",
                "border border-warning/30 shadow-lg",
                "ring-4 ring-background/50"
              )}>
                <ShieldAlert className="h-9 w-9 text-warning" />
              </div>
            </div>

            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
              Portal Temporarily Unavailable
            </CardTitle>
            
            <CardDescription className="text-sm sm:text-base mt-2 max-w-sm mx-auto">
              {resortName ? (
                <>
                  The guest portal for <strong>{resortName}</strong> is currently undergoing maintenance. 
                </>
              ) : (
                <>
                  The guest portal is currently undergoing maintenance.
                </>
              )}
              {' '}Please contact the front desk for assistance.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative space-y-4 pt-2">
            {/* Contact options */}
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Need assistance?
              </h4>
              <p className="text-xs text-muted-foreground">
                Our team is available 24/7 to help with your requests. Please call the front desk 
                or visit reception for immediate assistance.
              </p>
            </div>

            {/* Action button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate('/guest/login')}
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access allowed - render children
  return <>{children}</>;
}
