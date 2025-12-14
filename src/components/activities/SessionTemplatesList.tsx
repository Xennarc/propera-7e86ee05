import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from '@/types/database';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SessionTemplateDialog } from './SessionTemplateDialog';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SessionTemplate {
  id: string;
  resort_id: string;
  activity_id: string;
  name: string;
  start_time: string;
  end_time: string;
  capacity: number;
  resource_id: string | null;
  notes: string | null;
  is_active: boolean;
  activity?: Activity;
}

interface SessionTemplatesListProps {
  onApplyTemplate?: (template: SessionTemplate) => void;
}

export function SessionTemplatesList({ onApplyTemplate }: SessionTemplatesListProps) {
  const { currentResort } = useResort();
  const { hasAnyRole } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SessionTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canEdit = hasAnyRole(['ADMIN', 'FRONT_OFFICE', 'ACTIVITIES']);

  useEffect(() => {
    if (currentResort?.id) {
      fetchData();
    }
  }, [currentResort?.id]);

  const fetchData = async () => {
    if (!currentResort?.id) return;
    setLoading(true);

    const [templatesRes, activitiesRes] = await Promise.all([
      supabase
        .from('activity_session_templates')
        .select('*, activity:activities(*)')
        .eq('resort_id', currentResort.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('activities')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (templatesRes.data) {
      setTemplates(templatesRes.data as SessionTemplate[]);
    }
    if (activitiesRes.data) {
      setActivities(activitiesRes.data as Activity[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('activity_session_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Template deleted' });
      fetchData();
    }
    setDeleteConfirm(null);
  };

  const handleApply = (template: SessionTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
      toast({ title: 'Template applied', description: `Applied "${template.name}" settings` });
    }
  };

  if (!currentResort?.id) return null;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Session Templates ({templates.length})
                  </CardTitle>
                </div>
                {canEdit && (
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); setEditTemplate(null); setDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Template
                  </Button>
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm">Create templates to quickly apply common session configurations</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.activity?.name || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {template.start_time.slice(0, 5)} - {template.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>{template.capacity}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {onApplyTemplate && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleApply(template)}
                                  title="Apply template"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                              {canEdit && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => { setEditTemplate(template); setDialogOpen(true); }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => setDeleteConfirm(template.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <SessionTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={editTemplate}
        resortId={currentResort.id}
        activities={activities}
        onSuccess={fetchData}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
