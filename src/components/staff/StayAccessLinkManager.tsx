import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, QrCode, RefreshCw, Link2, Check, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, isBefore, parseISO } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { StaffAccessLink } from '@/hooks/useStaffGuestStay';

interface StayAccessLinkManagerProps {
  stayId: string;
  guestName: string;
  accessLinks: StaffAccessLink[];
  onLinkGenerated?: () => void;
}

interface CreateLinkResult {
  success: boolean;
  link_url?: string;
  expires_at?: string;
  error?: string;
}

export function StayAccessLinkManager({ 
  stayId, 
  guestName, 
  accessLinks, 
  onLinkGenerated 
}: StayAccessLinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  const isExpired = latestLink && isBefore(parseISO(latestLink.expiresAt), new Date());
  const isConsumed = latestLink && latestLink.consumedAt;
  const isActive = latestLink && !isExpired && !isConsumed;

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Pre-Arrival Access Link</span>
        {latestLink && (
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {isExpired && !isConsumed && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
            {isConsumed && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Check className="h-3 w-3 mr-1" />
                Used
              </Badge>
            )}
          </div>
        )}
      </div>

      {latestLink ? (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Created {formatDistanceToNow(parseISO(latestLink.createdAt), { addSuffix: true })}
            </span>
            {!isExpired && !isConsumed && (
              <span className="text-muted-foreground">
                Expires {formatDistanceToNow(parseISO(latestLink.expiresAt), { addSuffix: true })}
              </span>
            )}
          </div>

          {displayUrl && isActive && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(generatedUrl || '')}
                disabled={!generatedUrl}
                className="flex-1 min-w-[100px]"
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
              {generatedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateLinkMutation.isPending ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          )}

          {(isExpired || isConsumed) && (
            <Button
              variant="default"
              size="sm"
              onClick={() => generateLinkMutation.mutate()}
              disabled={generateLinkMutation.isPending}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateLinkMutation.isPending ? 'animate-spin' : ''}`} />
              Generate New Link
            </Button>
          )}
        </div>
      ) : (
        <Button
          onClick={() => generateLinkMutation.mutate()}
          disabled={generateLinkMutation.isPending}
          className="w-full"
        >
          <Link2 className={`h-4 w-4 mr-2 ${generateLinkMutation.isPending ? 'animate-spin' : ''}`} />
          Generate Pre-Arrival Access Link
        </Button>
      )}

      {/* QR Code Dialog */}
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
    </div>
  );
}
