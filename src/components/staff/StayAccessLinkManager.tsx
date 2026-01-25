import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { SendGuestCredentialsDialog } from '@/components/guests/SendGuestCredentialsDialog';
import { Guest } from '@/types/database';

interface StayAccessLinkManagerProps {
  stayId: string;
  guestName: string;
  guest?: Guest | null;
  accessLinks?: unknown[]; // Kept for backward compatibility but not used
  onLinkGenerated?: () => void;
}

/**
 * Manages guest access for pre-arrival and in-house stays.
 * Primary action: Send login credentials via email (PIN-based authentication)
 * 
 * Note: Legacy access links have been deprecated in favor of PIN-based authentication.
 */
export function StayAccessLinkManager({ 
  stayId, 
  guestName, 
  guest,
  onLinkGenerated 
}: StayAccessLinkManagerProps) {
  const queryClient = useQueryClient();
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);

  // Check if guest has email for credentials
  const canSendCredentials = guest && guest.email;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Guest Portal Access</span>
      </div>

      {/* Primary Action: Send Credentials */}
      <div className="space-y-2">
        <Button
          onClick={() => setCredentialsDialogOpen(true)}
          disabled={!guest}
          className="w-full"
        >
          <Mail className="h-4 w-4 mr-2" />
          Send Login Credentials
        </Button>
        
        {!canSendCredentials && guest && (
          <p className="text-xs text-muted-foreground text-center">
            No email on file. Add an email to send credentials, or copy them manually.
          </p>
        )}
        
        {!guest && (
          <p className="text-xs text-muted-foreground text-center">
            Guest data required to send credentials.
          </p>
        )}
      </div>

      {/* Send Credentials Dialog */}
      {guest && (
        <SendGuestCredentialsDialog
          open={credentialsDialogOpen}
          onOpenChange={setCredentialsDialogOpen}
          guests={[guest]}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['guests'] });
            onLinkGenerated?.();
          }}
        />
      )}
    </div>
  );
}
