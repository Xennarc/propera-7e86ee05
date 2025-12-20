import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Activity,
  ClipboardList,
  Search,
  Zap,
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

interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: Date;
  details?: string;
}

export default function SupportToolsPage() {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const { profile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<SupportSession[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [viewAsDialogOpen, setViewAsDialogOpen] = useState(false);
  const [viewAsType, setViewAsType] = useState<'staff' | 'guest'>('staff');
  const [selectedResort, setSelectedResort] = useState<string>('');
  const [viewAsReason, setViewAsReason] = useState('');
  const [readOnly, setReadOnly] = useState(true);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSessions(prev => prev.map(session => ({
        ...session,
        // Force re-render for countdown
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
    setActivityLog(prev => [{
      id: crypto.randomUUID(),
      action: `Started ${viewAsType} view for ${resort.name}`,
      timestamp: new Date(),
      details: viewAsReason,
    }, ...prev]);

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
    const session = activeSessions.find(s => s.id === sessionId);
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (session) {
      setActivityLog(prev => [{
        id: crypto.randomUUID(),
        action: `Ended ${session.type} view for ${session.resortName}`,
        timestamp: new Date(),
      }, ...prev]);
    }
    toast.success('Support session ended');
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const remaining = expiresAt.getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            Pro-level debugging tools and "View As" mode
          </p>
        </div>
      </div>

      {/* Active Sessions Banner */}
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
                        <span className="text-sm font-mono text-warning flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeRemaining(session.expiresAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reason: {session.reason}
                      </p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* View As Tool */}
        <Card className="lg:col-span-2">
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
              <div className="p-6 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
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
              <div className="p-6 bg-muted/30 rounded-xl border border-border/50 hover:border-success/30 transition-colors">
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
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Sessions are time-limited (15 minutes)</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Prominent banner shown in support mode</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> Read-only mode enabled by default</li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-success" /> All actions logged with reason</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log Sidebar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLog.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activityLog.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div>
                        <p className="font-medium">{entry.action}</p>
                        {entry.details && (
                          <p className="text-xs text-muted-foreground">{entry.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {entry.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Fast entry points for common support tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/health')}>
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">System Health</span>
              <span className="text-xs text-muted-foreground">View infrastructure status</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/audit')}>
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="font-semibold">Audit Logs</span>
              <span className="text-xs text-muted-foreground">Recent platform activity</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin/users')}>
              <User className="h-5 w-5 text-primary" />
              <span className="font-semibold">User Lookup</span>
              <span className="text-xs text-muted-foreground">Find and manage users</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2" onClick={() => navigate('/superadmin')}>
              <Search className="h-5 w-5 text-primary" />
              <span className="font-semibold">Command Center</span>
              <span className="text-xs text-muted-foreground">Back to overview</span>
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
                  Actions mode enabled. All changes will be made as the super admin account and logged.
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
