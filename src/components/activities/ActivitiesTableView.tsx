import { Activity } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge, CategoryIcon } from '@/components/ui/category-badge';
import { DemoActionWrapper } from '@/components/ui/demo-action-wrapper';
import { Edit, Trash2, Calendar, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';

interface ActivitiesTableViewProps {
  activities: Activity[];
  sessionCounts: Record<string, { total: number; upcoming: number }>;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  isReadOnly?: boolean;
}

export function ActivitiesTableView({
  activities,
  sessionCounts,
  onEdit,
  onDelete,
  isReadOnly = false,
}: ActivitiesTableViewProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[300px]">Activity</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Capacity</TableHead>
            <TableHead className="text-center">Sessions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => {
            const counts = sessionCounts[activity.id] || { total: 0, upcoming: 0 };
            
            return (
              <TableRow 
                key={activity.id}
                className="group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    {activity.image_url ? (
                      <img
                        src={activity.image_url}
                        alt={activity.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                        <CategoryIcon 
                          category={activity.category} 
                          iconKey={(activity as any).icon_key} 
                          size={20} 
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{activity.name}</p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <CategoryBadge 
                    category={activity.category} 
                    iconKey={(activity as any).icon_key} 
                    size="md" 
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {activity.duration_minutes} min
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  ${activity.default_price_per_person}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {activity.default_max_capacity} pax
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => navigate(`/staff/activities/sessions?activity=${activity.id}`)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm hover:bg-muted transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {counts.upcoming > 0 ? (
                      <span className="font-medium">{counts.upcoming}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={activity.is_active ? 'confirmed' : 'secondary'}>
                    {activity.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <DemoActionWrapper isReadOnly={isReadOnly} tooltipText="Editing is disabled in demo mode">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(activity)}
                        disabled={isReadOnly}
                        className="h-9 w-9"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DemoActionWrapper>
                    <DemoActionWrapper isReadOnly={isReadOnly} tooltipText="Deleting is disabled in demo mode">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(activity)}
                        disabled={isReadOnly}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </DemoActionWrapper>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
