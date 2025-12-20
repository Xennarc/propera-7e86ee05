import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPrearrivalUrl } from '@/lib/url-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface GeneratePreArrivalLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
}

export function GeneratePreArrivalLinkDialog({
  open,
  onOpenChange,
  guest,
}: GeneratePreArrivalLinkDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_prearrival_token', {
        p_guest_id: guest.id,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to generate link');
      }

      setToken(result.token);
      setExpiresAt(result.expires_at);
      
      toast({
        title: 'Link generated',
        description: 'Pre-arrival link is ready to share.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!token) return;
    const url = getPrearrivalUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setToken(null);
      setExpiresAt(null);
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Pre-Arrival Link
          </DialogTitle>
          <DialogDescription>
            Generate a secure link for {guest.full_name} to preview and book activities/restaurants before arrival.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Guest Info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest:</span>
              <span className="font-medium">{guest.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-medium">{guest.room_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stay:</span>
              <span className="font-medium">
                {format(parseISO(guest.check_in_date), 'MMM d')} – {format(parseISO(guest.check_out_date), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {!token ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to generate a unique pre-arrival link for this guest.
              </p>
              <Button onClick={generateLink} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="link">Pre-Arrival Link</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="link"
                    value={getPrearrivalUrl(token)}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="text-xs text-muted-foreground">
                  This link expires on {format(parseISO(expiresAt), 'MMM d, yyyy')} (3 days after checkout).
                </p>
              )}

              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-4">
                <p className="text-sm text-foreground">
                  <strong>How to use:</strong> Share this link via email, WhatsApp, or your preferred method. The guest can use it to browse and plan activities/restaurants for their stay.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
