import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Guest } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDate } from '@/lib/safe-date-format';
import {
  Mail,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Key,
  DoorOpen,
  User as UserIcon,
} from 'lucide-react';

interface SendGuestCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  onSuccess?: () => void;
}

interface GeneratePinResult {
  success: boolean;
  pin?: string;
  error?: string;
}

export function SendGuestCredentialsDialog({
  open,
  onOpenChange,
  guests,
  onSuccess,
}: SendGuestCredentialsDialogProps) {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editableEmails, setEditableEmails] = useState<Record<string, string>>({});
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'pending' | 'sending' | 'sent' | 'failed'>>({});
  const [generatedPins, setGeneratedPins] = useState<Record<string, string>>({});
  const [generatingPin, setGeneratingPin] = useState<Record<string, boolean>>({});

  const isBulk = guests.length > 1;
  const singleGuest = guests.length === 1 ? guests[0] : null;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setEditableEmails({});
      setSendingStatus({});
      setGeneratedPins({});
      setGeneratingPin({});
    }
  }, [open]);

  // Generate PIN for a guest if they don't have one
  const generatePinForGuest = async (guestId: string): Promise<string | null> => {
    setGeneratingPin(prev => ({ ...prev, [guestId]: true }));
    try {
      const { data, error } = await supabase.rpc('generate_guest_pin', {
        p_guest_id: guestId,
      });

      if (error) throw error;

      const result = data as unknown as GeneratePinResult;
      if (!result.success) throw new Error(result.error || 'Failed to generate PIN');
      
      const pin = result.pin!;
      setGeneratedPins(prev => ({ ...prev, [guestId]: pin }));
      return pin;
    } catch (error: any) {
      console.error('Failed to generate PIN:', error);
      toast({ variant: 'destructive', title: 'PIN Error', description: error.message });
      return null;
    } finally {
      setGeneratingPin(prev => ({ ...prev, [guestId]: false }));
    }
  };

  // Send credentials email mutation
  const sendCredentialsMutation = useMutation({
    mutationFn: async ({ guest, email, pin }: { guest: Guest; email: string; pin: string }) => {
      // Get resort code
      if (!currentResort?.code) {
        throw new Error('Resort code not available');
      }

      // Extract last name (first word after the first word, or the only word)
      const nameParts = guest.full_name.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];

      const { data, error } = await supabase.functions.invoke('send-guest-credentials', {
        body: {
          guestId: guest.id,
          guestName: guest.full_name,
          guestEmail: email,
          checkInDate: guest.check_in_date,
          resortId: currentResort.id,
          resortName: currentResort.name,
          resortCode: currentResort.code,
          roomNumber: guest.room_number,
          lastName,
          pin,
          resortLogoUrl: currentResort.login_logo_url,
          resortPrimaryColor: currentResort.login_primary_color,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-outbound-messages'] });
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
  });

  const handleSendSingle = async () => {
    if (!singleGuest) return;
    
    const email = editableEmails[singleGuest.id] || singleGuest.email;
    if (!email) {
      toast({ variant: 'destructive', title: 'No email', description: 'Please add an email address' });
      return;
    }

    // Get or generate PIN
    let pin = generatedPins[singleGuest.id];
    if (!pin && !singleGuest.portal_pin_last4) {
      pin = await generatePinForGuest(singleGuest.id) || '';
      if (!pin) return; // PIN generation failed
    } else if (!pin && singleGuest.portal_pin_last4) {
      // Guest has a PIN but we don't have the raw value - need to regenerate
      pin = await generatePinForGuest(singleGuest.id) || '';
      if (!pin) return;
    }

    setSendingStatus({ [singleGuest.id]: 'sending' });
    try {
      await sendCredentialsMutation.mutateAsync({ guest: singleGuest, email, pin });
      setSendingStatus({ [singleGuest.id]: 'sent' });
      toast({ title: 'Credentials sent!', description: `Login details sent to ${singleGuest.full_name}` });
      onSuccess?.();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (error: any) {
      setSendingStatus({ [singleGuest.id]: 'failed' });
      toast({ variant: 'destructive', title: 'Failed to send', description: error.message });
    }
  };

  const handleSendBulk = async () => {
    const validGuests = guests.filter(g => {
      const email = editableEmails[g.id] || g.email;
      return email && email.includes('@');
    });

    if (validGuests.length === 0) {
      toast({ variant: 'destructive', title: 'No valid emails', description: 'No guests have valid email addresses' });
      return;
    }

    // Initialize all as pending
    const initialStatus: Record<string, 'pending' | 'sending' | 'sent' | 'failed'> = {};
    validGuests.forEach(g => { initialStatus[g.id] = 'pending'; });
    setSendingStatus(initialStatus);

    let successCount = 0;
    let failCount = 0;

    for (const guest of validGuests) {
      const email = editableEmails[guest.id] || guest.email;
      setSendingStatus(prev => ({ ...prev, [guest.id]: 'sending' }));
      
      try {
        // Generate PIN if needed
        let pin = generatedPins[guest.id];
        if (!pin) {
          pin = await generatePinForGuest(guest.id) || '';
          if (!pin) {
            setSendingStatus(prev => ({ ...prev, [guest.id]: 'failed' }));
            failCount++;
            continue;
          }
        }

        await sendCredentialsMutation.mutateAsync({ guest, email: email!, pin });
        setSendingStatus(prev => ({ ...prev, [guest.id]: 'sent' }));
        successCount++;
      } catch (error) {
        setSendingStatus(prev => ({ ...prev, [guest.id]: 'failed' }));
        failCount++;
      }
      
      // Small delay between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast({
      title: 'Bulk send complete',
      description: `${successCount} sent, ${failCount} failed`,
      variant: failCount > 0 ? 'destructive' : 'default',
    });
    
    onSuccess?.();
    if (failCount === 0) {
      setTimeout(() => onOpenChange(false), 1500);
    }
  };

  const handleCopyCredentials = async () => {
    if (!singleGuest || !currentResort) return;
    
    // Get or generate PIN
    let pin = generatedPins[singleGuest.id];
    if (!pin) {
      pin = await generatePinForGuest(singleGuest.id) || '';
      if (!pin) return;
    }

    const nameParts = singleGuest.full_name.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
    const portalUrl = `https://propera.cc/resort/${currentResort.code.toLowerCase()}/guest/login`;

    const text = `Guest Portal Login Details

Portal: ${portalUrl}
Room: ${singleGuest.room_number}
Last Name: ${lastName}
PIN: ${pin}

Use these credentials to access activities, restaurants, and more before or during your stay.`;

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Login credentials copied to clipboard' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Please try again' });
    }
  };

  const getGuestEmail = (guest: Guest) => editableEmails[guest.id] || guest.email || '';
  const hasValidEmail = (guest: Guest) => {
    const email = getGuestEmail(guest);
    return email && email.includes('@');
  };

  const validGuestCount = guests.filter(hasValidEmail).length;
  const isSending = Object.values(sendingStatus).some(s => s === 'sending');
  const isGeneratingAnyPin = Object.values(generatingPin).some(g => g);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {isBulk ? `Send Login Credentials (${guests.length})` : 'Send Login Credentials'}
          </DialogTitle>
          <DialogDescription>
            {isBulk 
              ? 'Send guest portal login details to selected guests' 
              : 'Send room number, last name, and PIN for guest portal access'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Single guest card */}
          {singleGuest && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{singleGuest.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Room {singleGuest.room_number} • Check-in {safeFormatDate(singleGuest.check_in_date, 'MMM d')}
                    </p>
                  </div>
                  {sendingStatus[singleGuest.id] === 'sent' && (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sent
                    </Badge>
                  )}
                </div>

                {/* Credentials Preview */}
                <div className="rounded-lg border bg-muted/30 p-3 mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground w-20">Room:</span>
                    <span className="font-medium">{singleGuest.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground w-20">Last Name:</span>
                    <span className="font-medium">
                      {singleGuest.full_name.trim().split(/\s+/).slice(-1)[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground w-20">PIN:</span>
                    {generatedPins[singleGuest.id] ? (
                      <span className="font-mono font-bold text-primary tracking-wider">
                        {generatedPins[singleGuest.id]}
                      </span>
                    ) : singleGuest.portal_pin_last4 ? (
                      <span className="text-muted-foreground">
                        ••••{singleGuest.portal_pin_last4}
                        <span className="text-xs ml-2">(will regenerate)</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Will be generated</span>
                    )}
                    {generatingPin[singleGuest.id] && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="guest@example.com"
                    value={getGuestEmail(singleGuest)}
                    onChange={(e) => setEditableEmails(prev => ({ ...prev, [singleGuest.id]: e.target.value }))}
                  />
                  {!hasValidEmail(singleGuest) && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Valid email required
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bulk guest list */}
          {isBulk && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {guests.map(guest => (
                <Card key={guest.id} className={!hasValidEmail(guest) ? 'border-destructive/50' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{guest.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Room {guest.room_number} • {safeFormatDate(guest.check_in_date, 'MMM d')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {generatingPin[guest.id] && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {sendingStatus[guest.id] === 'sending' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {sendingStatus[guest.id] === 'sent' && (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        {sendingStatus[guest.id] === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        {!hasValidEmail(guest) && !sendingStatus[guest.id] && (
                          <Badge variant="outline" className="text-xs text-destructive border-destructive/50">
                            No email
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info box */}
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-foreground">
              <strong>What gets sent:</strong> The guest receives an email with their portal URL, room number, last name, and a secure PIN. They can use these to log in from any device.
            </p>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <span className="flex items-center gap-1">
              <Key className="h-3 w-3" />
              PIN stays valid for their entire stay
            </span>
            <span className="flex items-center gap-1">
              📱 Works on any device
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isBulk ? (
              <Button 
                onClick={handleSendBulk} 
                disabled={validGuestCount === 0 || isSending || isGeneratingAnyPin}
                className="w-full"
              >
                {isSending || isGeneratingAnyPin ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isGeneratingAnyPin ? 'Generating PINs...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {validGuestCount} guest{validGuestCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleSendSingle} 
                  disabled={
                    !hasValidEmail(singleGuest!) || 
                    sendingStatus[singleGuest!.id] === 'sending' || 
                    sendingStatus[singleGuest!.id] === 'sent' ||
                    generatingPin[singleGuest!.id]
                  }
                  className="w-full"
                >
                  {generatingPin[singleGuest!.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating PIN...
                    </>
                  ) : sendingStatus[singleGuest!.id] === 'sending' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : sendingStatus[singleGuest!.id] === 'sent' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Credentials
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCopyCredentials}
                  disabled={generatingPin[singleGuest!.id]}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy credentials to share manually
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
