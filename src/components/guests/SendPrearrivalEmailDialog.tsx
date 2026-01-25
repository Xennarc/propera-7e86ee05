import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getGuestPortalUrl } from '@/lib/url-utils';
import { Guest } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDate } from '@/lib/safe-date-format';
import {
  Mail,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Calendar,
} from 'lucide-react';

interface SendPrearrivalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  onSuccess?: () => void;
}

/**
 * Dialog for sending pre-arrival/login credential emails to guests.
 * Uses the send-guest-credentials edge function which handles PIN generation.
 */
export function SendPrearrivalEmailDialog({
  open,
  onOpenChange,
  guests,
  onSuccess,
}: SendPrearrivalEmailDialogProps) {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [editableEmails, setEditableEmails] = useState<Record<string, string>>({});
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'pending' | 'sending' | 'sent' | 'failed'>>({});

  // CRITICAL: Filter out any null/undefined guests from the array
  const validGuests = guests.filter((g): g is Guest => g != null && !!g.id);
  
  const isBulk = validGuests.length > 1;
  const singleGuest = validGuests.length === 1 ? validGuests[0] : null;

  // Send email mutation using send-guest-credentials edge function
  const sendEmailMutation = useMutation({
    mutationFn: async ({ guest, email }: { guest: Guest; email: string }) => {
      // Use send-guest-credentials which handles PIN generation and email sending
      const { data, error } = await supabase.functions.invoke('send-guest-credentials', {
        body: {
          guestIds: [guest.id],
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

    setSendingStatus({ [singleGuest.id]: 'sending' });
    try {
      await sendEmailMutation.mutateAsync({ guest: singleGuest, email });
      setSendingStatus({ [singleGuest.id]: 'sent' });
      toast({ title: 'Credentials sent!', description: `Login credentials sent to ${singleGuest.full_name}` });
      onSuccess?.();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (error: any) {
      setSendingStatus({ [singleGuest.id]: 'failed' });
      toast({ variant: 'destructive', title: 'Failed to send', description: error.message });
    }
  };

  const handleSendBulk = async () => {
    const guestsWithEmail = validGuests.filter(g => {
      const email = editableEmails[g.id] || g.email;
      return email && email.includes('@');
    });

    if (guestsWithEmail.length === 0) {
      toast({ variant: 'destructive', title: 'No valid emails', description: 'No guests have valid email addresses' });
      return;
    }

    // Initialize all as pending
    const initialStatus: Record<string, 'pending' | 'sending' | 'sent' | 'failed'> = {};
    guestsWithEmail.forEach(g => { initialStatus[g.id] = 'pending'; });
    setSendingStatus(initialStatus);

    // Send sequentially to avoid rate limits
    let successCount = 0;
    let failCount = 0;

    for (const guest of guestsWithEmail) {
      const email = editableEmails[guest.id] || guest.email;
      setSendingStatus(prev => ({ ...prev, [guest.id]: 'sending' }));
      
      try {
        await sendEmailMutation.mutateAsync({ guest, email: email! });
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

  const getGuestEmail = (guest: Guest) => editableEmails[guest.id] || guest.email || '';
  const hasValidEmail = (guest: Guest) => {
    const email = getGuestEmail(guest);
    return email && email.includes('@');
  };

  const validGuestCount = validGuests.filter(hasValidEmail).length;
  const isSending = Object.values(sendingStatus).some(s => s === 'sending');
  
  // CRITICAL: Don't render if no valid guests
  if (validGuests.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Send Login Credentials
            </DialogTitle>
            <DialogDescription>
              No valid guests selected
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Please select guests with valid data to send credentials.</p>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

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
              ? 'Send login credentials to selected guests' 
              : 'Send login credentials (room, name, PIN) to the guest'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Single guest summary */}
          {singleGuest && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
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
                
                <div className="mt-4 space-y-2">
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
              {validGuests.map(guest => (
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

          {/* Email Preview */}
          <Collapsible open={showPreview} onOpenChange={setShowPreview}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm text-muted-foreground">Preview email content</span>
                {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 bg-muted/50">
                <CardContent className="p-4 text-sm space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                    <p className="font-medium">Your Guest Portal Login for {currentResort?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
                    <p className="text-muted-foreground">
                      Dear {singleGuest ? singleGuest.full_name.split(' ')[0] : 'Guest'}, 
                      here are your login credentials for the guest portal. You can view activities, make reservations, and more...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Secure PIN-based login</span>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              PIN-based authentication
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Resort-specific
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {isBulk ? (
              <Button 
                onClick={handleSendBulk} 
                disabled={validGuestCount === 0 || isSending}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {validGuestCount} guest{validGuestCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            ) : singleGuest ? (
              <Button 
                onClick={handleSendSingle} 
                disabled={!hasValidEmail(singleGuest) || sendingStatus[singleGuest.id] === 'sending' || sendingStatus[singleGuest.id] === 'sent'}
                className="w-full"
              >
                {sendingStatus[singleGuest.id] === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : sendingStatus[singleGuest.id] === 'sent' ? (
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
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
