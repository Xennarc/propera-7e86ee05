import { useState, useMemo, useCallback } from 'react';
import { format, addMinutes, setHours, setMinutes, startOfDay, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Loader2, 
  Minus, 
  Plus, 
  Clock, 
  Zap, 
  AlertCircle,
  Package,
  Sparkles,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { categoryConfigs } from './RequestCategoryGrid';
import { SelectedItem } from './MultiSelectItemGrid';
import { validateScheduledTime } from '@/hooks/useServiceRequests';

interface RequestBundleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: SelectedItem[];
  onUpdateQuantity: (catalogId: string, delta: number) => void;
  onRemoveItem: (catalogId: string) => void;
  onSubmit: (params: BundleSubmitParams) => Promise<void>;
  isSubmitting: boolean;
}

export interface BundleSubmitParams {
  isAsap: boolean;
  requestedForAt?: string;
  guestNotes?: string;
  items: Array<{ catalogId: string; quantity: number }>;
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

export function RequestBundleSheet({
  open,
  onOpenChange,
  selectedItems,
  onUpdateQuantity,
  onRemoveItem,
  onSubmit,
  isSubmitting,
}: RequestBundleSheetProps) {
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [notes, setNotes] = useState('');

  const totalCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Group items by department to show routing info
  const departments = useMemo(() => {
    const depts = new Set(selectedItems.map((item) => item.departmentKey));
    return Array.from(depts);
  }, [selectedItems]);

  // Build scheduled datetime for validation
  const scheduledDateTime = useMemo(() => {
    if (isAsap || !scheduledDate) return undefined;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    return setMinutes(setHours(scheduledDate, hours), minutes).toISOString();
  }, [isAsap, scheduledDate, scheduledTime]);

  const timeValidationError = useMemo(() => {
    return validateScheduledTime(scheduledDateTime, isAsap);
  }, [scheduledDateTime, isAsap]);

  // Filter available time slots for today
  const availableTimeSlots = useMemo(() => {
    if (!scheduledDate) return TIME_SLOTS;
    
    const now = new Date();
    const isToday = startOfDay(scheduledDate).getTime() === startOfDay(now).getTime();
    
    if (!isToday) return TIME_SLOTS;
    
    const bufferTime = addMinutes(now, 15);
    return TIME_SLOTS.filter((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = setMinutes(setHours(scheduledDate, hours), minutes);
      return !isBefore(slotTime, bufferTime);
    });
  }, [scheduledDate]);

  const canSubmit = selectedItems.length > 0 && !timeValidationError;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    await onSubmit({
      isAsap,
      requestedForAt: scheduledDateTime,
      guestNotes: notes.trim() || undefined,
      items: selectedItems.map((item) => ({
        catalogId: item.catalogId,
        quantity: item.quantity,
      })),
    });
    
    // Reset form state
    setIsAsap(true);
    setScheduledDate(undefined);
    setScheduledTime('09:00');
    setNotes('');
  };

  const handleDateSelect = (date: Date | undefined) => {
    setScheduledDate(date);
    
    if (date) {
      const now = new Date();
      const isToday = startOfDay(date).getTime() === startOfDay(now).getTime();
      
      if (isToday) {
        const bufferTime = addMinutes(now, 15);
        const firstAvailable = TIME_SLOTS.find((time) => {
          const [hours, minutes] = time.split(':').map(Number);
          const slotTime = setMinutes(setHours(date, hours), minutes);
          return !isBefore(slotTime, bufferTime);
        });
        
        if (firstAvailable) {
          setScheduledTime(firstAvailable);
        }
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl flex flex-col">
        <SheetHeader className="text-left pb-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg">
                Your Request{totalCount > 1 ? 's' : ''} ({totalCount} item{totalCount !== 1 ? 's' : ''})
              </SheetTitle>
              <SheetDescription className="text-sm">
                Review and submit your request
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Selected items list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Items</Label>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {selectedItems.map((item) => {
                    const category = categoryConfigs.find(
                      (c) => c.key === item.category || c.key === item.departmentKey
                    ) || categoryConfigs[categoryConfigs.length - 1];

                    return (
                      <motion.div
                        key={item.catalogId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            'bg-gradient-to-br',
                            category.color
                          )}
                        >
                          <category.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground">{category.label}</p>
                        </div>
                        
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-6 h-6 rounded-full bg-background border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => onUpdateQuantity(item.catalogId, -1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-semibold tabular-nums w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="w-6 h-6 rounded-full bg-background border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => onUpdateQuantity(item.catalogId, 1)}
                            disabled={item.quantity >= 10}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => onRemoveItem(item.catalogId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Department routing info */}
            {departments.length > 1 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Smart routing:</span>{' '}
                  We'll send your items to the right teams ({departments.length} departments).
                </div>
              </div>
            )}

            {/* ASAP vs Scheduled */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">When do you need this?</Label>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isAsap ? 'default' : 'outline'}
                  className={cn(
                    'flex-1 h-12 gap-2 transition-all',
                    isAsap && 'ring-2 ring-primary ring-offset-2 shadow-md'
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
                    'flex-1 h-12 gap-2 transition-all',
                    !isAsap && 'ring-2 ring-primary ring-offset-2 shadow-md'
                  )}
                  onClick={() => {
                    setIsAsap(false);
                    if (!scheduledDate) handleDateSelect(new Date());
                  }}
                >
                  <Clock className="h-4 w-4" />
                  Schedule
                </Button>
              </div>
              
              {/* Date/Time pickers when scheduled */}
              {!isAsap && (
                <>
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
                            onSelect={handleDateSelect}
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
                          {availableTimeSlots.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No slots available today
                            </SelectItem>
                          ) : (
                            availableTimeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {timeValidationError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {timeValidationError}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="bundle-notes" className="text-sm font-medium">
                Special instructions <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="bundle-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific details or preferences..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Fixed bottom submit button */}
        <div className="flex-shrink-0 pt-4 border-t bg-background safe-area-inset-bottom">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Request
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            We'll route this to the right team{departments.length > 1 ? 's' : ''}.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
