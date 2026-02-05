import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreVertical, 
  Scissors, 
  Merge, 
  Copy,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface TripActionsProps {
  tripId: string;
  tripStatus: string;
  requestCount: number;
  onSplit?: (tripId: string) => void;
  onMerge?: (tripId: string) => void;
  onDuplicate?: (tripId: string) => void;
  onCancel?: (tripId: string) => void;
  onComplete?: (tripId: string) => void;
  disabled?: boolean;
  isCompleting?: boolean;
  isCancelling?: boolean;
}

export function TripActions({
  tripId,
  tripStatus,
  requestCount,
  onSplit,
  onMerge,
  onDuplicate,
  onCancel,
  onComplete,
  disabled,
  isCompleting,
  isCancelling,
}: TripActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  
  const isPlanningOnly = tripStatus === 'planning';
  const canSplit = isPlanningOnly && requestCount > 1;
  const canMerge = isPlanningOnly;
  
  // Complete: visible for assigned, en_route, active trips
  const canComplete = ['assigned', 'en_route', 'active'].includes(tripStatus);
  
  // Cancel: visible for planning, assigned, en_route trips
  const canCancel = ['planning', 'assigned', 'en_route'].includes(tripStatus);
  
  const isLoading = isCompleting || isCancelling;
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canComplete && onComplete && (
            <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </DropdownMenuItem>
          )}
          
          {canSplit && onSplit && (
            <DropdownMenuItem onClick={() => onSplit(tripId)}>
              <Scissors className="h-4 w-4 mr-2" />
              Split Trip
            </DropdownMenuItem>
          )}
          
          {canMerge && onMerge && (
            <DropdownMenuItem onClick={() => onMerge(tripId)}>
              <Merge className="h-4 w-4 mr-2" />
              Merge with...
            </DropdownMenuItem>
          )}
          
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(tripId)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Trip
            </DropdownMenuItem>
          )}
          
          {(canComplete || canSplit || canMerge || onDuplicate) && canCancel && onCancel && (
            <DropdownMenuSeparator />
          )}
          
          {canCancel && onCancel && (
            <DropdownMenuItem 
              onClick={() => setShowCancelDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel Trip
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Trip as Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all {requestCount} request(s) as completed. The trip will move to the completed history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                onComplete?.(tripId);
                setShowCompleteDialog(false);
              }}
            >
              Mark Complete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will return all {requestCount} request(s) to the queue. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Trip</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onCancel?.(tripId);
                setShowCancelDialog(false);
              }}
            >
              Cancel Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
