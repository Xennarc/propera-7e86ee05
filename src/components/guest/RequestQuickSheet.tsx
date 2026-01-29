import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useServiceRequestMutations } from '@/hooks/useServiceRequests';
import { useRequestSettings, formatResponseTime } from '@/hooks/useRequestSettings';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RequestQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_CHARS = 500;

export function RequestQuickSheet({ open, onOpenChange }: RequestQuickSheetProps) {
  const { guest } = useGuestAuth();
  const [requestText, setRequestText] = useState('');
  const [isAsap, setIsAsap] = useState(true);

  const { createRequest, isCreating } = useServiceRequestMutations(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  // Fetch dynamic settings
  const { settings } = useRequestSettings(guest?.resortId || '', !!guest?.resortId);

  const handleSubmit = async () => {
    if (!guest || !requestText.trim()) return;

    try {
      await createRequest({
        guestId: guest.guestId,
        resortId: guest.resortId,
        title: requestText.trim(),
        isAsap,
        departmentKey: 'FRONT_OFFICE',
      });

      setRequestText('');
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setRequestText(suggestion);
  };

  const canSubmit = requestText.trim().length > 0 && requestText.length <= MAX_CHARS && !isCreating;
  const charCount = requestText.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>How can we help?</DrawerTitle>
          <DrawerDescription>
            Describe what you need and our team will take care of it
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-2 space-y-4 overflow-y-auto">
          {/* Common Requests - 2-column grid, dynamic from settings */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Quick suggestions
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {settings.quickSuggestions.map((suggestion) => (
                <motion.button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-3 text-left rounded-xl border transition-all min-h-[44px]",
                    requestText === suggestion
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-muted/50 hover:bg-muted border-transparent"
                  )}
                >
                  <span className="text-sm font-medium">{suggestion}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Request Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="request-text">Your Request</Label>
              <span className={cn(
                "text-xs",
                isOverLimit ? "text-destructive" : "text-muted-foreground"
              )}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <Textarea
              id="request-text"
              placeholder="e.g., Extra towels, room service, wake-up call..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={4}
              className={cn(
                "resize-none text-base", // 16px prevents iOS zoom
                isOverLimit && "border-destructive focus-visible:ring-destructive"
              )}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Be as specific as possible so we can assist you better
            </p>
          </div>

          {/* ASAP Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">As Soon As Possible</p>
                <p className="text-xs text-muted-foreground">
                  {isAsap ? "We'll prioritize this request" : 'Standard timing'}
                </p>
              </div>
            </div>
            <Switch
              checked={isAsap}
              onCheckedChange={setIsAsap}
            />
          </div>

          {/* Estimated Response - dynamic from settings */}
          {requestText.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-primary/5 border border-primary/10"
            >
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Estimated response: </span>
                {isAsap 
                  ? `${settings.asapResponseMin}-${settings.asapResponseMax} minutes`
                  : `${settings.scheduledResponseMin}-${settings.scheduledResponseMax} minutes`}
              </p>
            </motion.div>
          )}
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
