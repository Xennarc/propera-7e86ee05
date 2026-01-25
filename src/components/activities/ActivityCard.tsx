import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryBadge, CategoryIcon } from '@/components/ui/category-badge';
import { 
  Clock, 
  Users, 
  DollarSign, 
  Edit, 
  Trash2, 
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ActivitySessionsList } from './ActivitySessionsList';

interface ActivityCardProps {
  activity: Activity;
  sessionCount?: number;
  upcomingSessionCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export function ActivityCard({
  activity,
  sessionCount = 0,
  upcomingSessionCount = 0,
  onEdit,
  onDelete,
  isReadOnly = false,
}: ActivityCardProps) {
  const navigate = useNavigate();
  const [showSessions, setShowSessions] = useState(false);

  const hasImage = !!activity.image_url;

  return (
    <Card 
      variant="interactive" 
      className={cn(
        "overflow-hidden transition-all duration-200",
        !activity.is_active && "opacity-60"
      )}
    >
      {/* Card Header with Image or Gradient */}
      <div className="relative h-32 sm:h-36 overflow-hidden">
        {hasImage ? (
          <img
            src={activity.image_url!}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
            <CategoryIcon 
              category={activity.category} 
              iconKey={(activity as any).icon_key}
              size={48} 
              className="opacity-30"
            />
          </div>
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <CategoryBadge 
            category={activity.category} 
            iconKey={(activity as any).icon_key}
            size="md"
          />
        </div>

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant={activity.is_active ? 'confirmed' : 'secondary'}
            className="text-[11px]"
          >
            {activity.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg leading-tight line-clamp-1">
            {activity.name}
          </h3>
          {activity.description && (
            <p className="text-white/70 text-sm line-clamp-1 mt-0.5">
              {activity.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Body - Key Metrics */}
      <div className="p-4 space-y-4">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{activity.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">${activity.default_price_per_person}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{activity.default_max_capacity} pax</span>
          </div>
        </div>

        {/* Sessions Preview */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {upcomingSessionCount > 0 ? (
                <span className="font-medium text-foreground">
                  {upcomingSessionCount} upcoming
                </span>
              ) : (
                <span className="text-muted-foreground">No upcoming sessions</span>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/staff/activities/sessions?activity=${activity.id}`)}
            className="h-8 px-2 text-xs"
          >
            View all
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Guest Booking Status Pills */}
        <div className="flex flex-wrap gap-2">
          {activity.guest_can_book ? (
            <Badge variant="outline" className="text-[11px] bg-success/10 text-success border-success/30">
              Guest bookable
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px]">
              Staff only
            </Badge>
          )}
          {activity.requires_approval && (
            <Badge variant="outline" className="text-[11px] bg-warning/10 text-warning border-warning/30">
              Requires approval
            </Badge>
          )}
          {activity.age_min && (
            <Badge variant="outline" className="text-[11px]">
              {activity.age_min}+ years
            </Badge>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isReadOnly}
            className="flex-1 h-10"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => navigate(`/staff/activities/sessions/new?activityId=${activity.id}`)}
                disabled={isReadOnly}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Add Session
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate(`/staff/activities/sessions?activity=${activity.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Sessions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                disabled={isReadOnly}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Activity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expandable Sessions Section (Mobile) */}
      <Collapsible open={showSessions} onOpenChange={setShowSessions}>
        <CollapsibleTrigger asChild>
          <button 
            className="w-full px-4 py-3 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-colors sm:hidden"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {sessionCount > 0 ? `${sessionCount} sessions` : 'Manage sessions'}
            </span>
            {showSessions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/50 px-4 py-4 bg-muted/30">
          <ActivitySessionsList
            activityId={activity.id}
            activityName={activity.name}
            resortId={activity.resort_id}
            onClose={() => setShowSessions(false)}
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface ActivityCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ActivityCardGrid({ children, className }: ActivityCardGridProps) {
  return (
    <div className={cn(
      "grid gap-4 sm:gap-5",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
