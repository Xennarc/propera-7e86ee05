import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';
import { CreateResortWizard } from './CreateResortWizard';

interface CreateResortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateResortDialog({ open, onOpenChange, onSuccess }: CreateResortDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Resort
          </DialogTitle>
          <DialogDescription>
            Set up a new resort property with its primary admin account
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[500px]">
          <CreateResortWizard 
            onSuccess={handleSuccess}
            onClose={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
