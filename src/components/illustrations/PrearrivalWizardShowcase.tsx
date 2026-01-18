import { Plane, Utensils, Clock, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const wizardSteps = [
  { id: 1, label: 'Arrival', icon: Plane, status: 'done' },
  { id: 2, label: 'Dietary', icon: Utensils, status: 'current' },
  { id: 3, label: 'Time', icon: Clock, status: 'pending' },
];

const dietaryOptions = [
  { emoji: '🥬', label: 'Vegetarian', selected: true },
  { emoji: '🌾', label: 'Gluten-free', selected: false },
  { emoji: '🥜', label: 'Nut allergy', selected: true },
];

export function PrearrivalWizardShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("w-[180px] bg-card/95 backdrop-blur-xl rounded-[24px] border-2 border-border/50 shadow-xl overflow-hidden", className)}>
      {/* Notch */}
      <div className="flex justify-center pt-2">
        <div className="w-14 h-4 bg-background rounded-full" />
      </div>

      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-bold text-foreground">Pre-arrival</p>
        <p className="text-[8px] text-muted-foreground">Step 2 of 3</p>
      </div>

      {/* Progress dots */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          {wizardSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  step.status === 'done' && "bg-success text-success-foreground",
                  step.status === 'current' && "bg-primary text-primary-foreground",
                  step.status === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  {step.status === 'done' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                {i < wizardSteps.length - 1 && (
                  <div className={cn(
                    "w-6 h-0.5 mx-1",
                    step.status === 'done' ? "bg-success" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step content */}
      <div className="px-3 pb-3">
        <p className="text-[9px] font-semibold text-foreground mb-2">Dietary Preferences</p>
        <div className="space-y-1.5">
          {dietaryOptions.map((option) => (
            <div
              key={option.label}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-all",
                option.selected
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card/80 border-border/30"
              )}
            >
              <span className="text-xs">{option.emoji}</span>
              <span className={cn(
                "text-[8px] font-medium flex-1",
                option.selected ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </span>
              {option.selected && (
                <Check className="h-2.5 w-2.5 text-primary" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <div className="px-3 pb-3">
        <button className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground rounded-lg py-2 text-[9px] font-semibold">
          Continue
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
      </div>
    </div>
  );
}
