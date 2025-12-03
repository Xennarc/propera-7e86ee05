import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, isAfter, startOfDay, parseISO } from 'date-fns';
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
}

export function GuestDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  className,
  hint = "Select a date to see available options",
}: GuestDatePickerProps) {
  const selectedDate = value ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  
  const minDateObj = minDate ? parseISO(minDate) : null;
  const maxDateObj = maxDate ? parseISO(maxDate) : null;

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const canGoPrev = !minDateObj || isAfter(startOfMonth(currentMonth), startOfMonth(minDateObj));
  const canGoNext = !maxDateObj || isBefore(endOfMonth(currentMonth), endOfMonth(maxDateObj));

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;
    if (minDateObj && isBefore(date, minDateObj)) return true;
    if (maxDateObj && isAfter(date, maxDateObj)) return true;
    return false;
  };

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    if (canGoNext) setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        {weekDays.map((day) => (
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
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDate(day)}
              disabled={isDisabled}
              className={cn(
                "h-10 w-full rounded-lg text-sm font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                isSelected && "bg-primary text-primary-foreground shadow-sm",
                !isSelected && isToday && "bg-accent text-accent-foreground",
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

      {/* Hint Text */}
      {hint && (
        <p className="text-xs text-muted-foreground text-center mt-4 pt-3 border-t">
          {hint}
        </p>
      )}
    </div>
  );
}
