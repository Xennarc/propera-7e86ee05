import { memo, useCallback } from 'react';
import { 
  Copy, 
  FileDown, 
  Send, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Guest } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface GuestBulkActionBarProps {
  selectedGuests: Guest[];
  onClearSelection: () => void;
  onSendPrearrival?: () => void;
  prearrivalEnabled: boolean;
  className?: string;
}

export const GuestBulkActionBar = memo(function GuestBulkActionBar({
  selectedGuests,
  onClearSelection,
  onSendPrearrival,
  prearrivalEnabled,
  className,
}: GuestBulkActionBarProps) {
  const { toast } = useToast();
  const { isKeyboardOpen } = useKeyboardInset();
  const count = selectedGuests.length;

  const handleCopyNames = useCallback(() => {
    const names = selectedGuests.map(g => g.full_name).join('\n');
    navigator.clipboard.writeText(names);
    toast({
      title: 'Copied',
      description: `${count} guest name${count > 1 ? 's' : ''} copied to clipboard`,
    });
  }, [selectedGuests, count, toast]);

  const handleCopyRooms = useCallback(() => {
    const rooms = selectedGuests.map(g => g.room_number || '-').join(', ');
    navigator.clipboard.writeText(rooms);
    toast({
      title: 'Copied',
      description: `${count} room number${count > 1 ? 's' : ''} copied to clipboard`,
    });
  }, [selectedGuests, count, toast]);

  const handleExportCSV = useCallback(() => {
    // Create CSV content
    const headers = ['Name', 'Room', 'Check-in', 'Check-out', 'Email', 'Phone', 'Booking Ref', 'VIP', 'Loyalty Tier'];
    const rows = selectedGuests.map(g => [
      g.full_name,
      g.room_number || '',
      g.check_in_date,
      g.check_out_date,
      g.email || '',
      g.phone || '',
      g.booking_reference || '',
      g.is_vip ? 'Yes' : 'No',
      g.loyalty_tier || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `guests-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Exported',
      description: `${count} guest${count > 1 ? 's' : ''} exported to CSV`,
    });
  }, [selectedGuests, count, toast]);

  // Hide when keyboard is open or no selection
  if (count === 0 || isKeyboardOpen) return null;

  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40',
        // Sit above mobile nav on mobile, normal on desktop
        'bottom-20 lg:bottom-4',
        'flex items-center gap-2 p-2 pl-4 rounded-full',
        'bg-background/95 backdrop-blur-sm border shadow-lg',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {count} guest{count > 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopyNames}
          className="gap-1.5"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Names</span>
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopyRooms}
          className="gap-1.5"
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Rooms</span>
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleExportCSV}
          className="gap-1.5"
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>

        {prearrivalEnabled && onSendPrearrival && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSendPrearrival}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Pre-Arrival</span>
          </Button>
        )}
      </div>

      <Button 
        variant="ghost" 
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8 rounded-full"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});
