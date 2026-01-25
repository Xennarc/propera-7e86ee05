import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Check, Clock, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';
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

type TokenType = 'instant' | 'confirm';

const EXPIRY_MINUTES: Record<TokenType, number> = {
  instant: 2,
  confirm: 2,
};

export function GuestQrLoginManager({
  guestId,
  guestName,
  roomNumber,
}: GuestQrLoginManagerProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenType, setTokenType] = useState<TokenType>('instant');
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

  const generateQrToken = async (type: TokenType) => {
    setGenerating(true);
    setTokenType(type);
    try {
      const { data, error } = await supabase.rpc('create_guest_login_token', {
        p_guest_id: guestId,
        p_token_type: type,
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
      // Use server-provided expiry time instead of hardcoded client estimate
      const serverExpiry = result.expires_at 
        ? new Date(result.expires_at) 
        : new Date(Date.now() + EXPIRY_MINUTES[type] * 60 * 1000);
      setExpiresAt(serverExpiry);
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
    // Use production URL format: https://propera.cc/guest/qr?t=TOKEN
    // For dev, use current origin
    const baseUrl = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://propera.cc';
    
    if (tokenType === 'instant') {
      // Instant login uses query param format
      return `${baseUrl}/guest/qr?t=${generatedToken}`;
    } else {
      // Confirm flow uses path param format
      return `${baseUrl}/guest/qr/${generatedToken}`;
    }
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
              Generate a QR code that the guest can scan to log in without entering credentials.
            </p>
            
            {/* Two button options */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => generateQrToken('instant')} 
                disabled={generating}
                className="flex-1"
              >
                <Zap className={`h-4 w-4 mr-2 ${generating && tokenType === 'instant' ? 'animate-pulse' : ''}`} />
                {generating && tokenType === 'instant' ? 'Generating...' : 'Instant Login'}
              </Button>
              <Button 
                onClick={() => generateQrToken('confirm')} 
                disabled={generating}
                variant="outline"
                className="flex-1"
              >
                <ShieldCheck className={`h-4 w-4 mr-2 ${generating && tokenType === 'confirm' ? 'animate-pulse' : ''}`} />
                {generating && tokenType === 'confirm' ? 'Generating...' : 'With Confirmation'}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              <strong>Instant:</strong> Guest scans and logs in immediately. <strong>With Confirmation:</strong> Guest must tap to confirm.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQrModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tokenType === 'instant' ? (
                <Zap className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              {tokenType === 'instant' ? 'Instant Login QR' : 'Confirmed Login QR'}
            </DialogTitle>
            <DialogDescription>
              {tokenType === 'instant' 
                ? `Show this QR code to ${guestName} (Room ${roomNumber}). They will be logged in immediately upon scanning.`
                : `Show this QR code to ${guestName} (Room ${roomNumber}). They will need to confirm their identity to log in.`
              }
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
                <strong>Security:</strong> This QR code is single-use and expires in {EXPIRY_MINUTES[tokenType]} minutes.
                {tokenType === 'instant' 
                  ? ' The guest will be logged in immediately upon scanning.'
                  : ' The guest must confirm their identity before logging in.'
                }
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
