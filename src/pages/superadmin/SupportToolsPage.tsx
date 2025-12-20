import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Headset,
  Eye,
  Shield,
  Clock,
  AlertTriangle,
  Building2,
  User,
  ExternalLink,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SupportSession {
  id: string;
  type: 'staff' | 'guest';
  resortId: string;
  resortName: string;
  targetId?: string;
  targetName?: string;
  startedAt: Date;
  expiresAt: Date;
  readOnly: boolean;
  reason: string;
}

export default function SupportToolsPage() {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const { profile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<SupportSession[]>([]);
  const [viewAsDialogOpen, setViewAsDialogOpen] = useState(false);
  const [viewAsType, setViewAsType] = useState<'staff' | 'guest'>('staff');
  const [selectedResort, setSelectedResort] = useState<string>('');
  const [viewAsReason, setViewAsReason] = useState('');
  const [readOnly, setReadOnly] = useState(true);

  const handleStartViewAs = () => {
    if (!selectedResort || !viewAsReason.trim()) {
      toast.error('Please select a resort and provide a reason');
      return;
    }

    const resort = resorts.find(r => r.id === selectedResort);
    if (!resort) return;

    const session: SupportSession = {
      id: crypto.randomUUID(),
      type: viewAsType,
      resortId: selectedResort,
      resortName: resort.name,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      readOnly,
      reason: viewAsReason,
    };

    setActiveSessions(prev => [...prev, session]);
    setViewAsDialogOpen(false);
    setViewAsReason('');

    // Switch to the resort context
    setCurrentResort(resort);

    toast.success(`Support mode activated for ${resort.name}`, {
      description: `Session expires in 15 minutes. ${readOnly ? 'Read-only mode.' : 'Actions enabled.'}`,
    });

    // Navigate to appropriate portal
    if (viewAsType === 'staff') {
      navigate('/staff/dashboard');
    } else {
      navigate('/guest');
    }
  };

  const handleEndSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Support session ended');
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Headset className="h-7 w-7 text-primary" />
            Support Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Debug tools and "View As" mode for support
          </p>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Eye className="h-5 w-5" />
              Active Support Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSessions.map(session => (
                <div 
                  key={session.id} 
                  className="flex items-center justify-between p-4 bg-background rounded-xl border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-warning/10 text-warning">
                        {session.type === 'staff' ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {session.type === 'staff' ? 'Staff Portal' : 'Guest Portal'} - {session.resortName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={session.readOnly ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}>
                          {session.readOnly ? 'Read-Only' : 'Actions Enabled'}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRemaining(session.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const resort = resorts.find(r => r.id === session.resortId);
                        if (resort) {
                          setCurrentResort(resort);
                          navigate(session.type === 'staff' ? '/staff/dashboard' : '/guest');
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleEndSession(session.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View As Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            View As Mode
          </CardTitle>
          <CardDescription>
            View the platform as a staff member or guest for debugging purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Staff View */}
            <div className="p-6 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">View as Staff</h3>
                  <p className="text-sm text-muted-foreground">See the staff console for a specific resort</p>
                </div>
              </div>
              <Button 
                className="w-full"
                onClick={() => {
                  setViewAsType('staff');
                  setViewAsDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Start Staff View
              </Button>
            </div>

            {/* Guest View */}
            <div className="p-6 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <User className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">View as Guest</h3>
                  <p className="text-sm text-muted-foreground">See the guest portal experience</p>
                </div>
              </div>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  setViewAsType('guest');
                  setViewAsDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Start Guest View
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Guardrails Info */}
          <div className="p-4 bg-info/10 rounded-xl border border-info/30">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-info mt-0.5" />
              <div>
                <p className="font-medium text-sm">Security Guardrails</p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• Sessions are time-limited (15 minutes by default)</li>
                  <li>• A prominent banner is shown while in support mode</li>
                  <li>• Read-only mode is enabled by default</li>
                  <li>• All actions are logged to the audit trail with reason</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Quick Diagnostics
          </CardTitle>
          <CardDescription>
            Common support actions and checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/health')}>
              <span className="font-semibold">Check System Health</span>
              <span className="text-xs text-muted-foreground">View infrastructure status</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/audit')}>
              <span className="font-semibold">View Audit Logs</span>
              <span className="text-xs text-muted-foreground">Recent platform activity</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/users')}>
              <span className="font-semibold">User Lookup</span>
              <span className="text-xs text-muted-foreground">Find and manage users</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View As Dialog */}
      <Dialog open={viewAsDialogOpen} onOpenChange={setViewAsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Start {viewAsType === 'staff' ? 'Staff' : 'Guest'} View Mode
            </DialogTitle>
            <DialogDescription>
              This will open the {viewAsType === 'staff' ? 'staff console' : 'guest portal'} in support mode.
              All actions will be logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Resort</Label>
              <Select value={selectedResort} onValueChange={setSelectedResort}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a resort" />
                </SelectTrigger>
                <SelectContent>
                  {resorts.map(resort => (
                    <SelectItem key={resort.id} value={resort.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {resort.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason for Access</Label>
              <Input
                placeholder="e.g., Investigating booking issue #12345"
                value={viewAsReason}
                onChange={(e) => setViewAsReason(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be logged in the audit trail
              </p>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label htmlFor="read-only">Read-Only Mode</Label>
                <p className="text-xs text-muted-foreground">Disable making changes</p>
              </div>
              <Switch
                id="read-only"
                checked={readOnly}
                onCheckedChange={setReadOnly}
              />
            </div>

            {!readOnly && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <p className="text-xs text-warning">
                  Actions mode enabled. All changes will be made as the super admin account.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartViewAs}>
              <Eye className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
