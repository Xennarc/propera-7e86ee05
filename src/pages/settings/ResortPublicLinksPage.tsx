import { useState } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, QrCode, Link as LinkIcon, ExternalLink, Info, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { getGuestPortalUrl, getGuestActivitiesUrl } from '@/lib/url-utils';

export default function ResortPublicLinksPage() {
  const { currentResort } = useResort();
  const { isSuperAdmin, getResortRole } = useAuth();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const currentResortRole = currentResort ? getResortRole(currentResort.id) : null;
  const canManage = isSuperAdmin() || currentResortRole === 'RESORT_ADMIN';

  if (!canManage) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guest Portal Links</h1>
          <p className="text-muted-foreground">Share links and QR codes with guests</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              You don't have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentResort) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Guest Portal Links</h1>
          <p className="text-muted-foreground">Share links and QR codes with guests</p>
        </div>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Please select a resort first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guestPortalUrl = getGuestPortalUrl(currentResort.code);
  const guestActivitiesUrl = getGuestActivitiesUrl(currentResort.code);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const resortStatus = (currentResort as any).status || 'ACTIVE';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guest Portal Links</h1>
        <p className="text-muted-foreground">Share links and QR codes with guests for {currentResort.name}</p>
      </div>

      {/* Resort Status Alert */}
      {resortStatus === 'INACTIVE' && (
        <Alert variant="destructive">
          <AlertDescription>
            This resort's guest portal is currently <strong>inactive</strong>. Guests will not be able to access the portal until you activate it.
          </AlertDescription>
        </Alert>
      )}

      {resortStatus === 'DEMO' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This is a <strong>demo resort</strong>. The guest portal is accessible but may be flagged as demo in some areas.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Guest Portal Link */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Guest Portal Login</CardTitle>
                <CardDescription>The main entry point for guests to access the portal</CardDescription>
              </div>
            </div>
            <Badge variant={resortStatus === 'ACTIVE' ? 'default' : resortStatus === 'DEMO' ? 'secondary' : 'destructive'}>
              {resortStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">URL</Label>
            <div className="flex gap-2">
              <Input 
                value={guestPortalUrl} 
                readOnly 
                className="font-mono text-sm bg-muted/50"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(guestPortalUrl, 'Portal link')}
              >
                {copiedLink === 'Portal link' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="h-4 w-4" />
              </Button>
              <a href={guestPortalUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Share this link or QR code with guests so they can access the guest portal directly. 
              This link can be placed on print materials in villas, at reception, or at the activity centers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Explorer Link */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/50">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Activity Explorer</CardTitle>
              <CardDescription>Direct link to browse all activities (requires login)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">URL</Label>
            <div className="flex gap-2">
              <Input 
                value={guestActivitiesUrl} 
                readOnly 
                className="font-mono text-sm bg-muted/50"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(guestActivitiesUrl, 'Activities link')}
              >
                {copiedLink === 'Activities link' ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Print QR codes</p>
                <p className="text-sm text-muted-foreground">Place QR codes in guest rooms, at the front desk, and activity centers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Include in welcome emails</p>
                <p className="text-sm text-muted-foreground">Send the link to guests before or during their stay</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Train staff</p>
                <p className="text-sm text-muted-foreground">Ensure staff know to direct guests to the portal link rather than a generic URL</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guest Portal QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to access the guest portal for {currentResort.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <QRCodeSVG 
                value={guestPortalUrl} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              {guestPortalUrl}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(guestPortalUrl, 'QR link')}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}