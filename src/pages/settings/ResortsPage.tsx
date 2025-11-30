import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Resort } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Building2, Sparkles, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ResortDialog } from './ResortDialog';
import { DemoResortDialog } from '@/components/demo/DemoResortDialog';
import { ConvertDemoDialog } from '@/components/demo/ConvertDemoDialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow, isPast } from 'date-fns';

export default function ResortsPage() {
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [editingResort, setEditingResort] = useState<Resort | null>(null);
  const [deleteResort, setDeleteResort] = useState<Resort | null>(null);
  const [convertingResort, setConvertingResort] = useState<Resort | null>(null);
  
  const { hasRole, isSuperAdmin } = useAuth();
  const { refetch: refetchResorts } = useResort();
  const { toast } = useToast();

  // Only admins can access this page
  if (!hasRole('ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchResorts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resorts')
      .select('*')
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setResorts(data as Resort[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResorts();
  }, []);

  const handleDelete = async () => {
    if (!deleteResort) return;
    
    const { error } = await supabase
      .from('resorts')
      .delete()
      .eq('id', deleteResort.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Resort deleted successfully' });
      fetchResorts();
      refetchResorts();
    }
    setDeleteResort(null);
  };

  const handleExpireDemo = async (resort: Resort) => {
    const { error } = await supabase
      .from('resorts')
      .update({
        demo_expires_at: new Date().toISOString(),
        status: 'INACTIVE',
      })
      .eq('id', resort.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Demo expired', description: 'Demo resort has been archived' });
      fetchResorts();
      refetchResorts();
    }
  };

  const getDemoExpiryStatus = (resort: Resort) => {
    if (!resort.demo_expires_at) return null;
    const expiresAt = new Date(resort.demo_expires_at);
    const isExpired = isPast(expiresAt);
    return {
      isExpired,
      text: isExpired 
        ? 'Expired' 
        : `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`,
    };
  };

  const filteredResorts = resorts.filter(resort =>
    resort.name.toLowerCase().includes(search.toLowerCase()) ||
    resort.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resorts</h1>
          <p className="text-muted-foreground">Manage resort properties (Admin only)</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin() && (
            <Button variant="outline" onClick={() => setDemoDialogOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Demo Resort
            </Button>
          )}
          <Button onClick={() => { setEditingResort(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Resort
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resorts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredResorts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {search ? 'No resorts found' : 'No resorts yet. Add your first resort!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResorts.map((resort) => {
                    const demoStatus = resort.is_demo ? getDemoExpiryStatus(resort) : null;
                    
                    return (
                      <TableRow key={resort.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{resort.name}</span>
                            {resort.is_demo && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                DEMO
                              </Badge>
                            )}
                          </div>
                          {demoStatus && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              {demoStatus.isExpired ? (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              <span className={demoStatus.isExpired ? 'text-destructive' : ''}>
                                {demoStatus.text}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {resort.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              resort.status === 'ACTIVE' ? 'default' : 
                              resort.status === 'INACTIVE' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {resort.status || 'ACTIVE'}
                          </Badge>
                        </TableCell>
                        <TableCell>{resort.timezone}</TableCell>
                        <TableCell>{resort.currency}</TableCell>
                        <TableCell className="text-right">
                          {resort.is_demo && isSuperAdmin() ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  Actions
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingResort(resort); setDialogOpen(true); }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setConvertingResort(resort); setConvertDialogOpen(true); }}>
                                  <ArrowRight className="mr-2 h-4 w-4" />
                                  Convert to Live
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExpireDemo(resort)}>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Expire Now
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteResort(resort)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingResort(resort); setDialogOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteResort(resort)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResortDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resort={editingResort}
        onSuccess={() => { fetchResorts(); refetchResorts(); }}
      />

      <DemoResortDialog
        open={demoDialogOpen}
        onOpenChange={setDemoDialogOpen}
        onSuccess={() => { fetchResorts(); refetchResorts(); }}
      />

      {convertingResort && (
        <ConvertDemoDialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          resort={convertingResort}
          onSuccess={() => { fetchResorts(); refetchResorts(); setConvertingResort(null); }}
        />
      )}

      <AlertDialog open={!!deleteResort} onOpenChange={() => setDeleteResort(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resort</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteResort?.name}? This will delete all associated data including guests, activities, and reservations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
