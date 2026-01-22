import { useState, useMemo, useCallback } from 'react';
import { format, setHours, setMinutes, startOfDay, isBefore, addMinutes } from 'date-fns';
import { KeyboardSafeDrawer, DrawerSection, DrawerSectionTitle } from '@/components/ui/keyboard-safe-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Minus, Plus, Clock, Zap, AlertCircle, Timer } from 'lucide-react';
import { CategoryConfig, categoryConfigs } from './RequestCategoryGrid';
import { useSubmitCooldown, formatCooldownTime } from '@/hooks/useSubmitCooldown';
import { CatalogItem, useServiceRequestMutations, validateScheduledTime } from '@/hooks/useServiceRequests';

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
}: RequestCreateSheetProps) {
  const { createRequest, isCreating } = useServiceRequestMutations(guestId, resortId);
  const { isOnCooldown, remainingSeconds, startCooldown } = useSubmitCooldown('request_single', 30);
  
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
  
  // Build scheduled datetime for validation
  const scheduledDateTime = useMemo(() => {
    if (isAsap || !scheduledDate) return undefined;
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    return setMinutes(setHours(scheduledDate, hours), minutes).toISOString();
  }, [isAsap, scheduledDate, scheduledTime]);
  
  // Validate time is not in the past
  const timeValidationError = useMemo(() => {
    return validateScheduledTime(scheduledDateTime, isAsap);
  }, [scheduledDateTime, isAsap]);
  
  // Filter available time slots for today (only future times)
  const availableTimeSlots = useMemo(() => {
    if (!scheduledDate) return TIME_SLOTS;
    
    const now = new Date();
    const isToday = startOfDay(scheduledDate).getTime() === startOfDay(now).getTime();
    
    if (!isToday) return TIME_SLOTS;
    
    // Filter to only future times (with 15 min buffer)
    const bufferTime = addMinutes(now, 15);
    return TIME_SLOTS.filter((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = setMinutes(setHours(scheduledDate, hours), minutes);
      return !isBefore(slotTime, bufferTime);
    });
  }, [scheduledDate]);
  
  const canSubmit = title.trim().length > 0 && 
    (!isOtherCategory || customTitle.trim()) && 
    !timeValidationError;
  
  const handleSubmit = useCallback(async () => {
    if (!category || !canSubmit || isOnCooldown) return;
    
    try {
      await createRequest({
        guestId,
        resortId,
        catalogId: selectedItem?.id,
        title: title.trim(),
        notes: notes.trim() || undefined,
        quantity,
        isAsap,
        requestedForAt: scheduledDateTime,
        departmentKey: selectedItem?.department_key || category.key,
        category: category.key,
      });
      
      // Start cooldown after successful submission
      startCooldown(30);
      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  }, [category, canSubmit, isOnCooldown, createRequest, guestId, resortId, selectedItem, title, notes, quantity, isAsap, scheduledDateTime, onOpenChange, startCooldown]);
  
  const resetForm = useCallback(() => {
    setSelectedItem(null);
    setCustomTitle('');
    setQuantity(1);
    setIsAsap(true);
    setScheduledDate(undefined);
    setScheduledTime('09:00');
    setNotes('');
  }, []);
  
  const handleClose = useCallback((value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  }, [resetForm, onOpenChange]);
  
  // Auto-select first available time slot when switching to today
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setScheduledDate(date);
    
    if (date) {
      const now = new Date();
      const isToday = startOfDay(date).getTime() === startOfDay(now).getTime();
      
      if (isToday) {
        // Find first available slot
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
  }, []);
  
  if (!category) return null;
  const CategoryIcon = category.icon;

  // Header icon for drawer
  const headerIcon = (
    <div className={cn(
      'w-10 h-10 rounded-xl flex items-center justify-center',
      'bg-gradient-to-br shadow-sm',
      category.color
    )}>
      <CategoryIcon className="h-5 w-5 text-white" />
    </div>
  );

  // Footer with submit button (shows cooldown when active)
  const footer = (
    <Button
      onClick={handleSubmit}
      disabled={!canSubmit || isCreating || isOnCooldown}
      className={cn(
        "w-full h-12 text-base font-semibold transition-all",
        isOnCooldown && "bg-muted text-muted-foreground"
      )}
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : isOnCooldown ? (
        <>
          <Timer className="mr-2 h-4 w-4" />
          Wait {formatCooldownTime(remainingSeconds)}
        </>
      ) : (
        'Submit Request'
      )}
    </Button>
  );

  return (
    <KeyboardSafeDrawer
      open={open}
      onOpenChange={handleClose}
      title={category.label}
      description="Tell us what you need"
      headerIcon={headerIcon}
      footer={footer}
      height="85vh"
    >
      <div className="space-y-1">
        {/* Item Selection (for non-OTHER categories) */}
        {!isOtherCategory && categoryItems.length > 0 && (
          <DrawerSection>
            <DrawerSectionTitle>Select Item</DrawerSectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {categoryItems.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={selectedItem?.id === item.id ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-3 px-3 justify-start text-left transition-all',
                    'min-h-[48px]', // Thumb-friendly tap target
                    selectedItem?.id === item.id && 'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <span className="truncate text-sm">{item.title}</span>
                </Button>
              ))}
            </div>
          </DrawerSection>
        )}

        {/* Custom title for OTHER or empty catalog */}
        {(isOtherCategory || categoryItems.length === 0) && (
          <DrawerSection>
            <DrawerSectionTitle>What do you need?</DrawerSectionTitle>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g., Extra pillow, Iron and board..."
              className="h-12"
              autoComplete="off"
            />
          </DrawerSection>
        )}

        {/* Quantity */}
        <DrawerSection>
          <DrawerSectionTitle>Quantity</DrawerSectionTitle>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold w-8 text-center tabular-nums">{quantity}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              disabled={quantity >= 10}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </DrawerSection>

        {/* ASAP vs Scheduled */}
        <DrawerSection>
          <DrawerSectionTitle>When do you need this?</DrawerSectionTitle>
          
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
              <span className="text-sm">ASAP</span>
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
              <span className="text-sm">Schedule</span>
            </Button>
          </div>
          
          {/* Date/Time pickers when scheduled - Progressive disclosure */}
          {!isAsap && (
            <div className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Date</label>
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
                  <label className="text-xs text-muted-foreground font-medium">Time</label>
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
              
              {/* Time validation error - inline, no blocking popup */}
              {timeValidationError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {timeValidationError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DrawerSection>

        {/* Notes */}
        <DrawerSection>
          <DrawerSectionTitle>
            Special instructions <span className="text-muted-foreground font-normal">(optional)</span>
          </DrawerSectionTitle>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific details or preferences..."
            rows={3}
            className="resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">
            {notes.length}/500
          </p>
        </DrawerSection>

        {/* Extra bottom padding for scroll comfort */}
        <div className="h-4" />
      </div>
    </KeyboardSafeDrawer>
  );
}
