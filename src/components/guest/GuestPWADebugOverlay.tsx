import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPWAStatus, forceUpdateCheck } from '@/lib/pwa-registration';
import { RefreshCw, X } from 'lucide-react';

function getIdentityInfo() {
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const displayMode = window.matchMedia('(display-mode: standalone)').matches
    ? 'standalone'
    : window.matchMedia('(display-mode: fullscreen)').matches
      ? 'fullscreen'
      : 'browser';
  return {
    title: document.title,
    manifestHref: manifestLink?.href || '(none)',
    displayMode,
    iosStandalone: (navigator as any).standalone as boolean | undefined,
    currentUrl: window.location.href,
    userAgent: navigator.userAgent,
    swController: !!navigator.serviceWorker?.controller,
  };
}

export function GuestPWADebugOverlay() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(getPWAStatus());
  const [identity] = useState(getIdentityInfo);
  const [open, setOpen] = useState(true);

  const show = searchParams.get('pwaDebug') === '1';

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => setStatus(getPWAStatus()), 5000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show || !open) return null;

  return (
    <Card className="fixed top-3 right-3 z-50 w-72 border-border/50 bg-background/95 backdrop-blur-sm shadow-lg text-xs">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground text-sm">PWA Debug</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Identity section */}
        <div className="space-y-1.5 text-muted-foreground border-b border-border/30 pb-2">
          <Row label="Title" value={identity.title} />
          <Row label="Manifest" value={identity.manifestHref.replace(/^https?:\/\/[^/]+/, '')} />
          <Row label="Display" value={
            <Badge variant={identity.displayMode === 'standalone' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {identity.displayMode}
            </Badge>
          } />
          <Row label="iOS standalone" value={
            <Badge variant={identity.iosStandalone ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {identity.iosStandalone === undefined ? 'N/A' : identity.iosStandalone ? 'Yes' : 'No'}
            </Badge>
          } />
          <Row label="URL" value={identity.currentUrl.replace(/^https?:\/\/[^/]+/, '')} />
          <Row label="SW Controller" value={
            <Badge variant={identity.swController ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {identity.swController ? 'Yes' : 'No'}
            </Badge>
          } />
          <Row label="UA" value={identity.userAgent.slice(0, 40) + '…'} />
        </div>

        {/* SW section */}
        <div className="space-y-1.5 text-muted-foreground">
          <Row label="SW Registered" value={
            <Badge variant={status.swRegistered ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {status.swRegistered ? 'Yes' : 'No'}
            </Badge>
          } />
          <Row label="Scope" value={status.swScopeUrl || '—'} />
          <Row label="Cache Version" value={status.cacheVersion || '—'} />
          <Row label="Last Check" value={status.lastUpdateCheck ? status.lastUpdateCheck.toLocaleTimeString() : '—'} />
          <Row label="Update Available" value={
            <Badge variant={status.updateAvailable ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
              {status.updateAvailable ? 'Yes' : 'No'}
            </Badge>
          } />
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => {
          forceUpdateCheck();
          setStatus(getPWAStatus());
        }}>
          <RefreshCw className="h-3 w-3 mr-1" /> Force Check
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="text-foreground font-mono truncate max-w-[140px] text-right">{value}</span>
    </div>
  );
}
