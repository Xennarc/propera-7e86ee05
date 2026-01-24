import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getPrearrivalUrl, getGuestAccessUrl } from '@/lib/url-utils';
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
  Copy,
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

  const isBulk = guests.length > 1;
  const singleGuest = guests.length === 1 ? guests[0] : null;

  // Fetch prearrival settings to check if enabled
  const { data: prearrivalSettings } = useQuery({
    queryKey: ['prearrival-settings', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return null;
      const { data, error } = await supabase
        .from('prearrival_settings')
        .select('is_enabled, welcome_message')
        .eq('resort_id', currentResort.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!currentResort,
  });

  // Generate or get existing prearrival link (tries new system first, falls back to legacy)
  const generateLinkMutation = useMutation({
    mutationFn: async (guest: Guest): Promise<string> => {
      // First, check if guest has a stay record for the new system
      const { data: stay } = await supabase
        .from('guest_stays')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('resort_id', currentResort?.id)
        .order('arrival_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (stay) {
        // Use new stay-based system
        const { data, error } = await supabase.rpc('create_guest_access_link', {
          p_stay_id: stay.id,
        });
        if (error) throw error;
        const result = data as { success: boolean; raw_token?: string; error?: string };
        if (!result.success) throw new Error(result.error || 'Failed to generate link');
        return getGuestAccessUrl(result.raw_token!);
      } else {
        // Fall back to legacy system
        const { data, error } = await supabase.rpc('generate_prearrival_token', {
          p_guest_id: guest.id,
        });
        if (error) throw error;
        const result = data as { success: boolean; token?: string; error?: string };
        if (!result.success) throw new Error(result.error || 'Failed to generate link');
        return getPrearrivalUrl(result.token!);
      }
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ guest, email }: { guest: Guest; email: string }) => {
      // Generate or get the link (uses new system if available)
      const prearrivalLink = await generateLinkMutation.mutateAsync(guest);

      // Send via edge function
      const { data, error } = await supabase.functions.invoke('send-prearrival-link', {
        body: {
          guestId: guest.id,
          guestName: guest.full_name,
          guestEmail: email,
          checkInDate: guest.check_in_date,
          resortId: currentResort?.id,
          resortName: currentResort?.name,
          prearrivalLink,
          resortLogoUrl: currentResort?.login_logo_url,
          resortPrimaryColor: currentResort?.login_primary_color,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-outbound-messages'] });
      queryClient.invalidateQueries({ queryKey: ['prearrival-link'] });
      queryClient.invalidateQueries({ queryKey: ['staff-guest-stay'] });
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
      toast({ title: 'Email sent!', description: `Pre-arrival email sent to ${singleGuest.full_name}` });
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

    // Send sequentially to avoid rate limits
    let successCount = 0;
    let failCount = 0;

    for (const guest of validGuests) {
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

  const handleCopyLink = async () => {
    if (!singleGuest) return;
    try {
      const link = await generateLinkMutation.mutateAsync(singleGuest);
      await navigator.clipboard.writeText(link);
      toast({ title: 'Link copied!', description: 'Pre-arrival link copied to clipboard' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    }
  };

  const getGuestEmail = (guest: Guest) => editableEmails[guest.id] || guest.email || '';
  const hasValidEmail = (guest: Guest) => {
    const email = getGuestEmail(guest);
    return email && email.includes('@');
  };

  const validGuestCount = guests.filter(hasValidEmail).length;
  const isSending = Object.values(sendingStatus).some(s => s === 'sending');

  if (!prearrivalSettings?.is_enabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Pre-Arrival Not Enabled
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Pre-arrival is not enabled for this resort. Please enable it in settings first.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
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
            {isBulk ? `Send Pre-Arrival Emails (${guests.length})` : 'Send Pre-Arrival Email'}
          </DialogTitle>
          <DialogDescription>
            {isBulk 
              ? 'Send pre-arrival check-in invitations to selected guests' 
              : 'Send a pre-arrival check-in invitation with a secure link'}
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
                <span className="text-sm text-muted-foreground">Preview email template</span>
                {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 bg-muted/50">
                <CardContent className="p-4 text-sm space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                    <p className="font-medium">Complete Your Pre-Arrival Check-in for {currentResort?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
                    <p className="text-muted-foreground">
                      Dear {singleGuest ? singleGuest.full_name.split(' ')[0] : 'Guest'}, 
                      we're thrilled to be hosting you. Please complete your online check-in to help us prepare...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Takes 2–3 minutes</span>
                    <Shield className="h-3 w-3 ml-2" />
                    <span>Secure link</span>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Secure link expires after arrival
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
            ) : (
              <>
                <Button 
                  onClick={handleSendSingle} 
                  disabled={!hasValidEmail(singleGuest!) || sendingStatus[singleGuest!.id] === 'sending' || sendingStatus[singleGuest!.id] === 'sent'}
                  className="w-full"
                >
                  {sendingStatus[singleGuest!.id] === 'sending' ? (
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
                      Send Email
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCopyLink}
                  disabled={generateLinkMutation.isPending}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy link instead
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
