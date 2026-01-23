import { useState } from 'react';
import { useGuestSessions, GuestSessionInfo } from '@/hooks/useGuestSessions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Trash2, 
  RefreshCw, 
  Clock,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
};

interface SessionItemProps {
  session: GuestSessionInfo;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}

function SessionItem({ session, onRevoke, isRevoking }: SessionItemProps) {
  const lastActive = new Date(session.last_active_at);
  const createdAt = new Date(session.created_at);

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${session.is_current ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <DeviceIcon type={session.device_type} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{session.device_name}</span>
            {session.is_current && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                This device
              </Badge>
            )}
          </div>
          {(session.browser_name || session.os_name) && (
            <p className="text-sm text-muted-foreground">
              {[session.browser_name, session.os_name].filter(Boolean).join(' • ')}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Active {formatDistanceToNow(lastActive, { addSuffix: true })}</span>
          </div>
        </div>
      </div>
      
      {!session.is_current && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRevoke(session.id)}
          disabled={isRevoking}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function GuestSessionManager() {
  const { sessions, loading, error, revokeSession, refetch } = useGuestSessions();
  const { toast } = useToast();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    
    setRevoking(confirmRevoke);
    const success = await revokeSession(confirmRevoke);
    setRevoking(null);
    setConfirmRevoke(null);

    if (success) {
      toast({
        title: 'Session Revoked',
        description: 'The device has been logged out.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to revoke session. Please try again.',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login & Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login & Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load sessions</p>
            <Button variant="ghost" size="sm" onClick={refetch} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login & Devices
          </CardTitle>
          <CardDescription>
            Manage your active login sessions. You can log out from any device here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  onRevoke={(id) => setConfirmRevoke(id)}
                  isRevoking={revoking === session.id}
                />
              ))}
            </div>
          )}

          {/* Security info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Sessions are automatically logged out when your stay ends. If you see a device you don't recognize, revoke it immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Revoke Dialog */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log Out Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately log out the selected device. They will need to log in again to access the guest portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log Out Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
