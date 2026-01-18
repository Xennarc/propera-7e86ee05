import { CheckCircle2, Circle, Clock, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tasks = [
  { id: 1, label: 'Check-in Villa 12', status: 'done', priority: 'normal', time: '09:00' },
  { id: 2, label: 'VIP dinner prep', status: 'in-progress', priority: 'high', time: '10:30' },
  { id: 3, label: 'Pool maintenance', status: 'pending', priority: 'normal', time: '11:00' },
  { id: 4, label: 'Guest request #42', status: 'pending', priority: 'urgent', time: '11:30' },
];

const statusIcons = {
  done: CheckCircle2,
  'in-progress': Clock,
  pending: Circle,
};

const priorityStyles = {
  normal: '',
  high: 'border-l-2 border-l-amber-500',
  urgent: 'border-l-2 border-l-red-500',
};

export function StaffTasksShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-[180px] bg-card/95 backdrop-blur-xl rounded-[24px] border-2 border-border/50 shadow-xl overflow-hidden", className)}>
      {/* Notch */}
      <div className="flex justify-center pt-2">
        <div className="w-14 h-4 bg-background rounded-full" />
      </div>

      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-foreground">Today's Tasks</span>
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <User className="h-2.5 w-2.5" />
            <span>Staff</span>
          </div>
        </div>
        <p className="text-[8px] text-muted-foreground mt-0.5">4 tasks remaining</p>
      </div>

      {/* Task list */}
      <div className="px-3 pb-3 space-y-1.5">
        {tasks.map((task) => {
          const StatusIcon = statusIcons[task.status as keyof typeof statusIcons];
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-card/80",
                priorityStyles[task.priority as keyof typeof priorityStyles],
                task.status === 'done' && 'opacity-60'
              )}
            >
              <StatusIcon className={cn(
                "h-3 w-3 shrink-0",
                task.status === 'done' && 'text-success',
                task.status === 'in-progress' && 'text-primary',
                task.status === 'pending' && 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[8px] font-medium text-foreground truncate",
                  task.status === 'done' && 'line-through'
                )}>
                  {task.label}
                </p>
                <p className="text-[7px] text-muted-foreground font-mono">{task.time}</p>
              </div>
              {task.priority === 'urgent' && (
                <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
    </div>
  );
}
