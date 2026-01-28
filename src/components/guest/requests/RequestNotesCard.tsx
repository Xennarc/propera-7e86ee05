import { memo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { MessageSquare, ChevronUp } from 'lucide-react';

interface RequestNotesCardProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  maxLength?: number;
  placeholder?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export const RequestNotesCard = memo(function RequestNotesCard({
  notes,
  onNotesChange,
  maxLength = 500,
  placeholder = 'Any special instructions or preferences...',
  expanded = false,
  onExpandedChange,
}: RequestNotesCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to calculate scroll height
    textarea.style.height = 'auto';
    // Set height to scroll height with max limit
    const maxHeight = 120; // 5 lines approx
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [notes, expanded, adjustHeight]);

  const handleFocus = useCallback(() => {
    onExpandedChange?.(true);
  }, [onExpandedChange]);

  const isNearLimit = notes.length > maxLength * 0.8;

  return (
    <Card
      className={cn(
        'border-border/50 bg-card/60 backdrop-blur-sm',
        'transition-all duration-200',
        expanded && 'ring-1 ring-primary/30'
      )}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="request-notes"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              Add a note
              <span className="text-xs font-normal">(optional)</span>
            </Label>
            
            {/* Character count - only show when typing */}
            <AnimatePresence>
              {notes.length > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    'text-[10px] tabular-nums',
                    isNearLimit ? 'text-amber-500' : 'text-muted-foreground'
                  )}
                >
                  {notes.length}/{maxLength}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            id="request-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value.slice(0, maxLength))}
            onFocus={handleFocus}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={1}
            className={cn(
              'resize-none min-h-[44px] text-base', // 16px prevents iOS zoom
              'bg-transparent border-0 p-0',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-muted-foreground/50'
            )}
            style={{ overflow: 'hidden' }}
          />

          {/* Collapse hint when expanded with content */}
          <AnimatePresence>
            {expanded && notes.length > 0 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => {
                  onExpandedChange?.(false);
                  textareaRef.current?.blur();
                }}
                className="flex items-center justify-center gap-1 w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronUp className="h-3 w-3" />
                Done
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
});
