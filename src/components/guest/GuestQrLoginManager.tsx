import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Check, Clock, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface GuestQrLoginManagerProps {
  guestId: string;
  guestName: string;
  roomNumber: string;
}

interface TokenResult {
  success: boolean;
  token?: string;
  expires_at?: string;
  guest_id?: string;
  type?: string;
  error?: string;
}

const QR_EXPIRY_MINUTES = 2;

export function GuestQrLoginManager({
  guestId,
  guestName,
  roomNumber,
}: GuestQrLoginManagerProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Countdown timer for token expiry
  useEffect(() => {
    if (!expiresAt || !showQrModal) return;

    const updateRemaining = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Token expired, close modal
        closeModal();
        toast({
          variant: 'destructive',
          title: 'QR Code Expired',
          description: 'The QR code has expired. Generate a new one if needed.',
        });
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, showQrModal, toast]);

  const generateQrToken = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('create_guest_login_token', {
        p_guest_id: guestId,
        p_token_type: 'confirm',
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to generate QR code. Please try again.',
        });
        return;
      }

      const result = data as unknown as TokenResult;
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error === 'UNAUTHORIZED' 
            ? 'You do not have permission to generate login codes for this guest.'
            : result.error || 'Failed to generate QR code.',
        });
        return;
      }

      setGeneratedToken(result.token || null);
      // Override with 2 minute expiry for confirm flow
      setExpiresAt(new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000));
      setShowQrModal(true);
      setCopied(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getQrUrl = () => {
    if (!generatedToken) return '';
    // Build the full URL for the guest to scan
    const baseUrl = window.location.origin;
    return `${baseUrl}/guest/qr/${generatedToken}`;
  };

  const copyLink = async () => {
    const url = getQrUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Login link copied to clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy. Please copy manually.',
      });
    }
  };

  const closeModal = () => {
    setShowQrModal(false);
    setGeneratedToken(null);
    setExpiresAt(null);
    setCopied(false);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpiringSoon = timeRemaining <= 30 && timeRemaining > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Quick Login QR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generate a QR code that the guest can scan to log in instantly. The guest will need to confirm their identity before logging in.
            </p>
            <Button onClick={generateQrToken} disabled={generating}>
              <QrCode className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
              {generating ? 'Generating...' : 'Generate Login QR'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQrModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Guest Login QR Code
            </DialogTitle>
            <DialogDescription>
              Show this QR code to {guestName} (Room {roomNumber}). They will need to confirm their identity to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border">
              {generatedToken && (
                <QRCodeSVG
                  value={getQrUrl()}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            {/* Timer Display */}
            <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
              isExpiringSoon 
                ? 'bg-destructive/10 border border-destructive/30' 
                : 'bg-muted'
            }`}>
              {isExpiringSoon ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm font-medium ${
                isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                Expires in {formatTime(timeRemaining)}
              </span>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Security:</strong> This QR code is single-use and expires in {QR_EXPIRY_MINUTES} minutes. The guest must confirm their identity before logging in.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={copyLink} className="flex-1" variant={copied ? 'outline' : 'default'}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button onClick={closeModal} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
