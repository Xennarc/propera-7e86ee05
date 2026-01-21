import { useState } from 'react';
import { format, addHours, setHours, setMinutes, startOfDay } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Minus, Plus, Clock, Zap } from 'lucide-react';
import { CategoryConfig, categoryConfigs } from './RequestCategoryGrid';
import { CatalogItem, useServiceRequestMutations } from '@/hooks/useServiceRequests';

interface RequestCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryConfig | null;
  catalogItems: CatalogItem[];
  guestId: string;
  resortId: string;
  resortTimezone?: string;
}

// Generate time slots (every 30 min from 6 AM to 11 PM)
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export function RequestCreateSheet({
  open,
  onOpenChange,
  category,
  catalogItems,
  guestId,
  resortId,
  resortTimezone,
}: RequestCreateSheetProps) {
  const { createRequest, isCreating } = useServiceRequestMutations(guestId, resortId);
  
  // Form state
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [notes, setNotes] = useState('');
  
  // Filter catalog items by category
  const categoryItems = catalogItems.filter(
    (item) => item.category === category?.key || item.department_key === category?.key
  );
  
  const isOtherCategory = category?.key === 'OTHER';
  const title = selectedItem?.title || customTitle;
  const canSubmit = title.trim().length > 0 && (!isOtherCategory || customTitle.trim());
  
  const handleSubmit = async () => {
    if (!category || !canSubmit) return;
    
    let requestedForAt: string | undefined;
    if (!isAsap && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const scheduledDateTime = setMinutes(setHours(scheduledDate, hours), minutes);
      requestedForAt = scheduledDateTime.toISOString();
    }
    
    try {
      await createRequest({
        guestId,
        resortId,
        catalogId: selectedItem?.id,
        title: title.trim(),
        notes: notes.trim() || undefined,
        quantity,
        isAsap,
        requestedForAt,
        departmentKey: selectedItem?.department_key || category.key,
        category: category.key,
      });
      
      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };
  
  const resetForm = () => {
    setSelectedItem(null);
    setCustomTitle('');
    setQuantity(1);
    setIsAsap(true);
    setScheduledDate(undefined);
    setScheduledTime('09:00');
    setNotes('');
  };
  
  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };
  
  if (!category) return null;
  const CategoryIcon = category.icon;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br',
              category.color
            )}>
              <CategoryIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-lg">{category.label}</SheetTitle>
              <SheetDescription className="text-sm">
                Tell us what you need
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 overflow-y-auto pb-24 -mx-6 px-6">
          {/* Item Selection (for non-OTHER categories) */}
          {!isOtherCategory && categoryItems.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Item</Label>
              <div className="grid grid-cols-2 gap-2">
                {categoryItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={selectedItem?.id === item.id ? 'default' : 'outline'}
                    className={cn(
                      'h-auto py-3 px-3 justify-start text-left',
                      selectedItem?.id === item.id && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setSelectedItem(item)}
                  >
                    <span className="truncate">{item.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom title for OTHER or empty catalog */}
          {(isOtherCategory || categoryItems.length === 0) && (
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">What do you need?</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Extra pillow, Iron and board..."
                className="h-12"
              />
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ASAP vs Scheduled */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">When do you need this?</Label>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isAsap ? 'default' : 'outline'}
                className={cn(
                  'flex-1 h-12 gap-2',
                  isAsap && 'ring-2 ring-primary ring-offset-2'
                )}
                onClick={() => setIsAsap(true)}
              >
                <Zap className="h-4 w-4" />
                As soon as possible
              </Button>
              <Button
                type="button"
                variant={!isAsap ? 'default' : 'outline'}
                className={cn(
                  'flex-1 h-12 gap-2',
                  !isAsap && 'ring-2 ring-primary ring-offset-2'
                )}
                onClick={() => {
                  setIsAsap(false);
                  if (!scheduledDate) setScheduledDate(new Date());
                }}
              >
                <Clock className="h-4 w-4" />
                Schedule
              </Button>
            </div>
            
            {/* Date/Time pickers when scheduled */}
            {!isAsap && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full h-11 justify-start text-left font-normal',
                          !scheduledDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, 'EEE, MMM d') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < startOfDay(new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Select value={scheduledTime} onValueChange={setScheduledTime}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Special instructions <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific details or preferences..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        {/* Fixed bottom submit button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t safe-area-inset-bottom">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isCreating}
            className="w-full h-12 text-base font-semibold"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
