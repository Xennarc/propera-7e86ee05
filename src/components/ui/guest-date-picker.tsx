import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, isAfter, startOfDay, parseISO, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface GuestDatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  hint?: string;
  compact?: boolean; // Show week strip by default
}

export function GuestDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  className,
  hint = "Select a date to see available options",
  compact = true,
}: GuestDatePickerProps) {
  const today = new Date();
  const selectedDate = value ? parseISO(value) : today;
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [showFullCalendar, setShowFullCalendar] = useState(!compact);
  
  const minDateObj = minDate ? parseISO(minDate) : null;
  const maxDateObj = maxDate ? parseISO(maxDate) : null;

  const isDateDisabled = (date: Date) => {
    const todayStart = startOfDay(new Date());
    if (isBefore(date, todayStart)) return true;
    if (minDateObj && isBefore(date, minDateObj)) return true;
    if (maxDateObj && isAfter(date, maxDateObj)) return true;
    return false;
  };

  // Generate week days centered around selected date
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({
      start: weekStart,
      end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
    });
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const newDate = subDays(selectedDate, 7);
    if (!isDateDisabled(newDate)) {
      onChange(format(newDate, 'yyyy-MM-dd'));
    } else if (minDateObj) {
      onChange(format(minDateObj, 'yyyy-MM-dd'));
    }
  };

  const handleNextWeek = () => {
    const newDate = addDays(selectedDate, 7);
    if (!isDateDisabled(newDate)) {
      onChange(format(newDate, 'yyyy-MM-dd'));
    } else if (maxDateObj) {
      onChange(format(maxDateObj, 'yyyy-MM-dd'));
    }
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(format(date, 'yyyy-MM-dd'));
      if (showFullCalendar && compact) {
        setShowFullCalendar(false);
      }
    }
  };

  // Full calendar logic
  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);
  const canGoPrev = !minDateObj || isAfter(startOfMonth(currentMonth), startOfMonth(minDateObj));
  const canGoNext = !maxDateObj || isBefore(endOfMonth(currentMonth), endOfMonth(maxDateObj));

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) setCurrentMonth(addMonths(currentMonth, 1));
  };

  const weekDayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Compact week strip view
  if (compact && !showFullCalendar) {
    return (
      <div className={cn("bg-card rounded-xl border shadow-soft p-3", className)}>
        {/* Week strip header with expand button */}
        <div className="flex items-center justify-between mb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevWeek}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button 
            onClick={() => {
              setCurrentMonth(startOfMonth(selectedDate));
              setShowFullCalendar(true);
            }}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{format(selectedDate, 'MMM yyyy')}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Week strip grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isDisabled = isDateDisabled(day);
            const isToday = isSameDay(day, today);
            
            return (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground font-medium mb-1">
                  {weekDayLabels[day.getDay()]}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  disabled={isDisabled}
                  className={cn(
                    "w-10 h-10 rounded-full text-sm font-semibold transition-all tap-target flex items-center justify-center",
                    isSelected && "bg-primary text-primary-foreground shadow-sm",
                    !isSelected && isToday && "ring-2 ring-primary/50 bg-primary/10 text-primary",
                    !isSelected && !isToday && !isDisabled && "hover:bg-muted text-foreground",
                    isDisabled && "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  {format(day, 'd')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Full month calendar view
  return (
    <div className={cn("bg-card rounded-xl border shadow-soft p-4", className)}>
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className="h-9 w-9 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className="h-9 w-9 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, idx) => (
          <div key={`pad-${idx}`} className="h-10" />
        ))}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isDisabled = isDateDisabled(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDate(day)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-full rounded-lg text-sm font-medium transition-all min-h-[44px]",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected && "bg-primary text-primary-foreground shadow-sm",
                !isSelected && isToday && "ring-2 ring-primary/50 bg-primary/10 text-primary font-semibold",
                !isSelected && !isToday && !isDisabled && "hover:bg-muted",
                isDisabled && "text-muted-foreground/40 cursor-not-allowed",
                !isCurrentMonth && "opacity-50"
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Done button for compact mode */}
      {compact && (
        <div className="mt-4 pt-3 border-t flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFullCalendar(false)}
            className="text-primary"
          >
            Done
          </Button>
        </div>
      )}

      {/* Hint Text */}
      {hint && !compact && (
        <p className="text-xs text-muted-foreground text-center mt-4 pt-3 border-t">
          {hint}
        </p>
      )}
    </div>
  );
}
