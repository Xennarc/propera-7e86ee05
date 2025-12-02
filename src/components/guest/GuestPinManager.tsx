import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Key, Copy, RefreshCw, Check, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GuestPinManagerProps {
  guestId: string;
  guestName: string;
  pinLast4: string | null;
  pinSetAt: string | null;
  portalEnabled: boolean;
  onPinUpdated: () => void;
}

export function GuestPinManager({
  guestId,
  guestName,
  pinLast4,
  pinSetAt,
  portalEnabled,
  onPinUpdated,
}: GuestPinManagerProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePin = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_guest_pin', {
        p_guest_id: guestId,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to generate PIN. Please try again.',
        });
        return;
      }

      const result = data as { success: boolean; pin?: string; error?: string };
      
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to generate PIN.',
        });
        return;
      }

      setGeneratedPin(result.pin || null);
      setShowPinModal(true);
      setCopied(false);
      onPinUpdated();
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

  const copyPin = async () => {
    if (!generatedPin) return;
    try {
      await navigator.clipboard.writeText(generatedPin);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'PIN copied to clipboard.',
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
    setShowPinModal(false);
    setGeneratedPin(null);
    setCopied(false);
  };

  const hasPin = portalEnabled && pinLast4;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Guest Portal PIN
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPin ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg font-mono text-lg">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">••••</span>
                  <span className="font-semibold">{pinLast4}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  PIN ending in {pinLast4}
                </span>
              </div>
              {pinSetAt && (
                <p className="text-sm text-muted-foreground">
                  Last updated {formatDistanceToNow(new Date(pinSetAt), { addSuffix: true })}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                The guest can log in to the portal using their room number, last name, and this PIN.
              </p>
              <Button onClick={generatePin} disabled={generating} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Reset PIN'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No PIN assigned yet. Generate a PIN to allow this guest to log in to the guest portal.
              </p>
              <Button onClick={generatePin} disabled={generating}>
                <Key className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate PIN'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPinModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Guest PIN Generated
            </DialogTitle>
            <DialogDescription>
              Share this PIN with {guestName} so they can log in to the guest portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Guest PIN</p>
              <p className="text-5xl font-mono font-bold tracking-widest text-primary">
                {generatedPin}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This PIN will only be shown once. Make sure to share it with the guest now.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyPin} className="flex-1" variant={copied ? 'outline' : 'default'}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy PIN
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