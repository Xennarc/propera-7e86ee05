import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TimePickerProps {
  value: string; // HH:mm format (24h)
  onChange: (value: string) => void;
  label?: string;
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  // Parse the 24h time value
  const [hours24, minutes] = value ? value.split(':').map(Number) : [12, 0];
  
  // Convert to 12h format for display
  const isPM = hours24 >= 12;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  
  const handleHourChange = (newHour: string) => {
    const hour12 = parseInt(newHour);
    let hour24: number;
    if (isPM) {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    } else {
      hour24 = hour12 === 12 ? 0 : hour12;
    }
    onChange(`${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };
  
  const handleMinuteChange = (newMinute: string) => {
    onChange(`${String(hours24).padStart(2, '0')}:${newMinute}`);
  };
  
  const handlePeriodChange = (newPeriod: string) => {
    let newHour24: number;
    if (newPeriod === 'PM') {
      newHour24 = hours12 === 12 ? 12 : hours12 + 12;
    } else {
      newHour24 = hours12 === 12 ? 0 : hours12;
    }
    onChange(`${String(newHour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        {/* Hour */}
        <Select value={String(hours12)} onValueChange={handleHourChange}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <SelectItem key={h} value={String(h)}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="flex items-center text-muted-foreground">:</span>
        
        {/* Minute */}
        <Select value={String(minutes).padStart(2, '0')} onValueChange={handleMinuteChange}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['00', '15', '30', '45'].map(m => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* AM/PM */}
        <Select value={isPM ? 'PM' : 'AM'} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Simple 24h time picker with direct hour/minute selection
export function TimePicker24({ value, onChange, label }: TimePickerProps) {
  const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];
  
  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${String(minutes).padStart(2, '0')}`);
  };
  
  const handleMinuteChange = (newMinute: string) => {
    onChange(`${String(hours).padStart(2, '0')}:${newMinute}`);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        {/* Hour (00-23) */}
        <Select value={String(hours).padStart(2, '0')} onValueChange={handleHourChange}>
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="flex items-center text-muted-foreground font-medium">:</span>
        
        {/* Minute (00, 15, 30, 45) */}
        <Select value={String(minutes).padStart(2, '0')} onValueChange={handleMinuteChange}>
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['00', '15', '30', '45'].map(m => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
