import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPrearrivalUrl } from '@/lib/url-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Link as LinkIcon, Copy, RefreshCw, Ban, Share2, MoreHorizontal, Check, ExternalLink, Eye, Mail, Loader2 } from 'lucide-react';
import { SharePrearrivalLinkDialog } from './SharePrearrivalLinkDialog';

interface PrearrivalLinkManagerProps {
  guestId: string;
  guestName: string;
  guestEmail?: string | null;
  checkInDate: string;
  checkOutDate: string;
  resortId: string;
  resortName: string;
  resortLogoUrl?: string | null;
  resortPrimaryColor?: string | null;
}

interface PrearrivalLink {
  id: string;
  token: string;
  token_hint: string | null;
  status: string;
  expires_at: string;
  last_opened_at: string | null;
  completed_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function PrearrivalLinkManager({
  guestId,
  guestName,
  guestEmail,
  checkInDate,
  checkOutDate,
  resortId,
  resortName,
  resortLogoUrl,
  resortPrimaryColor,
}: PrearrivalLinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentLink, setCurrentLink] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Fetch existing link
  const { data: existingLink, isLoading } = useQuery({
    queryKey: ['prearrival-link', guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prearrival_tokens')
        .select('*')
        .eq('guest_id', guestId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as PrearrivalLink | null;
    },
  });

  // Generate new link mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_prearrival_token', {
        p_guest_id: guestId,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['prearrival-link', guestId] });
        const link = getPrearrivalUrl(data.token);
        setCurrentLink(link);
        toast({
          title: 'Link generated',
          description: 'Pre-arrival link is ready to share.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data?.error || 'Failed to generate link',
        });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  // Regenerate link mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('regenerate_prearrival_link', {
        p_guest_id: guestId,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      if (data?.success) {
        queryClient.invalidateQueries({ queryKey: ['prearrival-link', guestId] });
        const link = getPrearrivalUrl(data.token);
        setCurrentLink(link);
        toast({
          title: 'Link regenerated',
          description: 'Old link revoked. New link is ready.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data?.error || 'Failed to regenerate link',
        });
      }
    },
  });

  // Revoke link mutation
  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!existingLink) throw new Error('No link to revoke');
      const { data, error } = await supabase.rpc('revoke_prearrival_link', {
        p_link_id: existingLink.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearrival-link', guestId] });
      toast({
        title: 'Link revoked',
        description: 'The pre-arrival link is no longer valid.',
      });
    },
  });

  const copyLink = async () => {
    const link = existingLink ? getPrearrivalUrl(existingLink.token) : currentLink;
    if (!link) return;
    
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const openShareDialog = () => {
    const link = existingLink ? getPrearrivalUrl(existingLink.token) : currentLink;
    if (link) {
      setCurrentLink(link);
      setShareDialogOpen(true);
    }
  };

  const sendEmailDirectly = async () => {
    if (!guestEmail) {
      toast({
        variant: 'destructive',
        title: 'No email address',
        description: 'This guest has no email address on file. Use the share dialog to enter one.',
      });
      openShareDialog();
      return;
    }

    const link = existingLink ? getPrearrivalUrl(existingLink.token) : currentLink;
    if (!link) return;

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-prearrival-link', {
        body: {
          guestId,
          guestName,
          guestEmail,
          checkInDate,
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
          description: `Pre-arrival link sent to ${guestEmail}`,
        });
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

  const getStatusBadge = (link: PrearrivalLink) => {
    if (link.completed_at) {
      return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
    }
    if (link.last_opened_at) {
      return <Badge className="bg-lagoon/10 text-lagoon border-lagoon/20">Opened</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  // No existing link - show generate button
  if (!existingLink) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        {generateMutation.isPending ? 'Generating...' : 'Generate Pre-Arrival Link'}
      </Button>
    );
  }

  // Existing link - show status and actions
  const fullLink = getPrearrivalUrl(existingLink.token);

  return (
    <>
      <div className="flex items-center gap-3">
        {getStatusBadge(existingLink)}
        
        {existingLink.last_opened_at && !existingLink.completed_at && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Opened {format(parseISO(existingLink.last_opened_at), 'MMM d')}
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={openShareDialog}
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={sendEmailDirectly}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isSendingEmail ? 'Sending...' : 'Send via Email'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(fullLink, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => revokeMutation.mutate()}
                disabled={revokeMutation.isPending}
                className="text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Revoke Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SharePrearrivalLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        link={currentLink || fullLink}
        guest={{ 
          id: guestId,
          full_name: guestName, 
          check_in_date: checkInDate,
          email: guestEmail,
        }}
        resortId={resortId}
        resortName={resortName}
        resortLogoUrl={resortLogoUrl}
        resortPrimaryColor={resortPrimaryColor}
      />
    </>
  );
}
