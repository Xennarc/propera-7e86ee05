import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Check, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface GuestQrLoginManagerProps {
  guestId: string;
  guestName: string;
  roomNumber: string;
}

interface SignQrResponse {
  success: boolean;
  url?: string;
  expiresAt?: string;
  pin?: string;
  error?: string;
}

const EXPIRY_MINUTES = 10;

export function GuestQrLoginManager({
  guestId,
  guestName,
  roomNumber,
}: GuestQrLoginManagerProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Countdown timer for URL expiry
  useEffect(() => {
    if (!expiresAt || !showQrModal) return;

    const updateRemaining = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // QR expired, close modal
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

  const generateSignedQr = async () => {
    setGenerating(true);
    try {
      // Call the sign-qr-login edge function
      const { data, error } = await supabase.functions.invoke<SignQrResponse>('sign-qr-login', {
        body: {
          guestId,
          expiryMinutes: EXPIRY_MINUTES,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to generate QR code. Please try again.',
        });
        return;
      }

      if (!data?.success || !data.url) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data?.error === 'Access denied to this resort'
            ? 'You do not have permission to generate login codes for this guest.'
            : data?.error || 'Failed to generate QR code.',
        });
        return;
      }

      setGeneratedUrl(data.url);
      setGeneratedPin(data.pin || null);
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000));
      setShowQrModal(true);
      setCopied(false);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
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
    setGeneratedUrl(null);
    setGeneratedPin(null);
    setExpiresAt(null);
    setCopied(false);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpiringSoon = timeRemaining <= 60 && timeRemaining > 0;

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
              Generate a QR code that the guest can scan to log in instantly. This will create a fresh PIN for the guest.
            </p>
            
            <Button 
              onClick={generateSignedQr} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground">
              The QR code expires after {EXPIRY_MINUTES} minutes. The guest will be logged in automatically when they scan it.
            </p>
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
              Show this QR code to {guestName} (Room {roomNumber}). They will be logged in automatically upon scanning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border">
              {generatedUrl && (
                <QRCodeSVG
                  value={generatedUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              )}
            </div>

            {/* New PIN Notice */}
            {generatedPin && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                <p className="text-sm font-medium text-primary">
                  New PIN: <span className="font-mono text-lg">{generatedPin}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this PIN with the guest if they need to log in manually later.
                </p>
              </div>
            )}

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
                <strong>Security:</strong> This QR code expires in {EXPIRY_MINUTES} minutes. 
                The guest will be logged in instantly when they scan it.
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
