import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, QrCode, RefreshCw, Check, Clock, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDistanceToNow, safeIsBeforeNow } from '@/lib/safe-date-format';
import { QRCodeSVG } from 'qrcode.react';
import { StaffAccessLink } from '@/hooks/useStaffGuestStay';
import { SendGuestCredentialsDialog } from '@/components/guests/SendGuestCredentialsDialog';
import { Guest } from '@/types/database';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StayAccessLinkManagerProps {
  stayId: string;
  guestName: string;
  guest?: Guest | null;
  accessLinks: StaffAccessLink[];
  onLinkGenerated?: () => void;
}

interface CreateLinkResult {
  success: boolean;
  link_url?: string;
  expires_at?: string;
  error?: string;
}

/**
 * Manages guest access for pre-arrival and in-house stays.
 * Primary action: Send login credentials via email (PIN-based authentication)
 * Secondary action: Legacy access links (deprecated, shown for existing links only)
 */
export function StayAccessLinkManager({ 
  stayId, 
  guestName, 
  guest,
  accessLinks, 
  onLinkGenerated 
}: StayAccessLinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [showLegacyLinks, setShowLegacyLinks] = useState(false);

  // Legacy link generation (kept for backward compatibility)
  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_guest_access_link', {
        p_stay_id: stayId,
      });

      if (error) throw error;
      return data as unknown as CreateLinkResult;
    },
    onSuccess: (result) => {
      if (result.success && result.link_url) {
        setGeneratedUrl(result.link_url);
        toast({
          title: 'Access link generated',
          description: 'The guest can now use this link to access the portal.',
        });
        queryClient.invalidateQueries({ queryKey: ['staff-guest-stay'] });
        onLinkGenerated?.();
      } else {
        toast({
          title: 'Failed to generate link',
          description: result.error || 'Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Error generating link:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate access link.',
        variant: 'destructive',
      });
    },
  });

  const latestLink = accessLinks[0];
  const isExpired = latestLink && safeIsBeforeNow(latestLink.expiresAt);
  const isConsumed = latestLink && latestLink.consumedAt;
  const isActive = latestLink && !isExpired && !isConsumed;
  const hasLegacyLinks = accessLinks.length > 0;

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied', description: 'The access link has been copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please select and copy manually.', variant: 'destructive' });
    }
  };

  const displayUrl = generatedUrl || (latestLink && isActive ? `${window.location.origin}/guest/access?t=...${latestLink.tokenHint}` : null);

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

      {/* Legacy Access Links Section (collapsed by default) */}
      {hasLegacyLinks && (
        <Collapsible open={showLegacyLinks} onOpenChange={setShowLegacyLinks}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
              {showLegacyLinks ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide legacy access links
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show legacy access links ({accessLinks.length})
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Legacy Pre-Arrival Link</span>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  {isExpired && !isConsumed && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                  {isConsumed && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Used
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Created {safeFormatDistanceToNow(latestLink.createdAt, { addSuffix: true })}
                {!isExpired && !isConsumed && (
                  <> • Expires {safeFormatDistanceToNow(latestLink.expiresAt, { addSuffix: true })}</>
                )}
              </div>

              {displayUrl && isActive && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generatedUrl || '')}
                    disabled={!generatedUrl}
                    className="flex-1 min-w-[100px] text-xs"
                  >
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  {generatedUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrDialogOpen(true)}
                      className="text-xs"
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      QR
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateLinkMutation.mutate()}
                    disabled={generateLinkMutation.isPending}
                    className="text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${generateLinkMutation.isPending ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              )}

              {(isExpired || isConsumed) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateLinkMutation.mutate()}
                  disabled={generateLinkMutation.isPending}
                  className="w-full text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${generateLinkMutation.isPending ? 'animate-spin' : ''}`} />
                  Generate New Link
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* QR Code Dialog for Legacy Links */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guest Access Link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {generatedUrl && (
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <QRCodeSVG value={generatedUrl} size={200} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {guestName} can scan this QR code to access the guest portal.
            </p>
            <Button 
              variant="outline" 
              onClick={() => generatedUrl && handleCopy(generatedUrl)}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Credentials Dialog */}
      {guest && (
        <SendGuestCredentialsDialog
          open={credentialsDialogOpen}
          onOpenChange={setCredentialsDialogOpen}
          guests={[guest]}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['guests'] });
          }}
        />
      )}
    </div>
  );
}
