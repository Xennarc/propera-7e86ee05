import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { safeFormatDate } from '@/lib/safe-date-format';
import { Copy, Check, MessageCircle, Mail, MessageSquare, ExternalLink, Send, Loader2 } from 'lucide-react';

interface SharePrearrivalLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
  guest: {
    id?: string;
    full_name: string;
    check_in_date: string;
    email?: string | null;
  };
  resortId: string;
  resortName: string;
  resortLogoUrl?: string | null;
  resortPrimaryColor?: string | null;
}

export function SharePrearrivalLinkDialog({
  open,
  onOpenChange,
  link,
  guest,
  resortId,
  resortName,
  resortLogoUrl,
  resortPrimaryColor,
}: SharePrearrivalLinkDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [emailAddress, setEmailAddress] = useState(guest.email || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const firstName = guest.full_name.split(' ')[0];
  const checkInFormatted = safeFormatDate(guest.check_in_date, 'MMMM d, yyyy') || 'your arrival date';

  const templates = {
    whatsapp: `Hi ${firstName}! 👋

We're excited to welcome you to ${resortName} on ${checkInFormatted}.

To help us prepare for your arrival, please complete your online check-in:
${link}

It takes just 2–3 minutes to share your arrival details and preferences.

Looking forward to hosting you!`,
    sms: `Hi ${firstName}! Complete your online check-in for ${resortName} (arriving ${checkInFormatted}): ${link}

Takes 2-3 minutes. See you soon!`,
    email: `Subject: Complete Your Pre-Arrival Check-in for ${resortName}

Dear ${firstName},

We're looking forward to welcoming you to ${resortName} on ${checkInFormatted}.

To ensure we prepare everything perfectly for your arrival, please take a moment to complete your online check-in:

${link}

This quick process (2–3 minutes) allows you to:
• Confirm your arrival details
• Share any dietary preferences or allergies
• Let us know about special occasions
• Pre-book activities and dining

If you have any questions, please don't hesitate to reach out.

Warm regards,
The ${resortName} Team`,
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast({
      title: 'Copied!',
      description: `${type === 'link' ? 'Link' : 'Message'} copied to clipboard.`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(templates.whatsapp);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const sendEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-prearrival-link', {
        body: {
          guestId: guest.id,
          guestName: guest.full_name,
          guestEmail: emailAddress,
          checkInDate: guest.check_in_date,
          resortId,
          resortName,
          prearrivalLink: link,
          resortLogoUrl: resortLogoUrl || undefined,
          resortPrimaryColor: resortPrimaryColor || undefined,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Email sent!',
          description: `Pre-arrival link sent to ${emailAddress}`,
        });
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to send email',
        description: error.message || 'Please try again later.',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Pre-Arrival Link</DialogTitle>
          <DialogDescription>
            Send the check-in link to {guest.full_name} via your preferred channel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick copy link */}
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-xs break-all">
              {link}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(link, 'link')}
              className="shrink-0"
            >
              {copied === 'link' ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Message templates */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="sms" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-3 mt-4">
              <Textarea
                value={templates.whatsapp}
                readOnly
                rows={10}
                className="font-mono text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyToClipboard(templates.whatsapp, 'whatsapp')}
                >
                  {copied === 'whatsapp' ? (
                    <Check className="h-4 w-4 mr-2 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Message
                </Button>
                <Button onClick={openWhatsApp} className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open WhatsApp
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="sms" className="space-y-3 mt-4">
              <Textarea
                value={templates.sms}
                readOnly
                rows={4}
                className="font-mono text-sm resize-none"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(templates.sms, 'sms')}
              >
                {copied === 'sms' ? (
                  <Check className="h-4 w-4 mr-2 text-success" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy Message
              </Button>
            </TabsContent>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email-address">Recipient Email</Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="guest@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
              
              <Textarea
                value={templates.email}
                readOnly
                rows={12}
                className="font-mono text-sm resize-none"
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyToClipboard(templates.email, 'email')}
                >
                  {copied === 'email' ? (
                    <Check className="h-4 w-4 mr-2 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Email
                </Button>
                <Button
                  className="flex-1"
                  onClick={sendEmail}
                  disabled={isSendingEmail || !emailAddress}
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isSendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center pt-2">
            The link expires on check-out day. You can regenerate it anytime from the guest profile.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
