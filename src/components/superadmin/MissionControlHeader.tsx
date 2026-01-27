import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { Command, Radio, Settings, Search, ShieldCheck, Shield, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionControlHeaderProps {
  mode: 'pulse' | 'control' | 'investigate' | 'security';
  onModeChange: (mode: 'pulse' | 'control' | 'investigate' | 'security') => void;
  includeDemos: boolean;
  onIncludeDemosChange: (value: boolean) => void;
  writeMode: boolean;
  writeModeExpiry: Date | null;
  onEnableWriteMode: () => void;
  onDisableWriteMode: () => void;
  showWriteModeConfirm: boolean;
  onShowWriteModeConfirmChange: (show: boolean) => void;
}

export function MissionControlHeader({
  mode,
  onModeChange,
  includeDemos,
  onIncludeDemosChange,
  writeMode,
  writeModeExpiry,
  onEnableWriteMode,
  onDisableWriteMode,
  showWriteModeConfirm,
  onShowWriteModeConfirmChange,
}: MissionControlHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Title Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Command className="h-5 w-5" />
            </div>
            Command Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1 tracking-wide">
            Platform overview and global controls
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Write Mode Badge */}
          {writeMode && writeModeExpiry && (
            <Badge 
              variant="destructive" 
              className="animate-pulse cursor-pointer flex items-center gap-1.5"
              onClick={onDisableWriteMode}
            >
              <Pencil className="h-3 w-3" />
              Write Mode ({formatDistanceToNow(writeModeExpiry)})
            </Badge>
          )}

          {/* Write Mode Toggle */}
          <AlertDialog open={showWriteModeConfirm} onOpenChange={onShowWriteModeConfirmChange}>
            <AlertDialogTrigger asChild>
              <Button 
                variant={writeMode ? "destructive" : "outline"} 
                size="sm" 
                className="gap-1.5"
                onClick={() => writeMode ? onDisableWriteMode() : onShowWriteModeConfirmChange(true)}
              >
                <Shield className="h-4 w-4" />
                {writeMode ? 'Disable Write' : 'Write Mode'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-warning" />
                  Enable Write Mode?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Write Mode allows you to make real changes to resort settings and configurations.</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>It will automatically disable after <strong>10 minutes</strong> for safety</li>
                    <li>All actions will be logged to the audit trail</li>
                    <li>Changes take effect immediately</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onEnableWriteMode} className="bg-warning text-warning-foreground hover:bg-warning/90">
                  Enable Write Mode
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Mode Tabs - Glassmorphism style */}
          <Tabs 
            value={mode} 
            onValueChange={(v) => onModeChange(v as typeof mode)} 
            className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-xl p-1"
          >
            <TabsList className="grid grid-cols-4 gap-1 bg-transparent">
              <TabsTrigger 
                value="pulse" 
                className={cn(
                  'text-xs gap-1.5 rounded-lg transition-all duration-200',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm'
                )}
              >
                <Radio className="h-3 w-3" />
                Pulse
              </TabsTrigger>
              <TabsTrigger 
                value="control" 
                className={cn(
                  'text-xs gap-1.5 rounded-lg transition-all duration-200',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm'
                )}
              >
                <Settings className="h-3 w-3" />
                Control
              </TabsTrigger>
              <TabsTrigger 
                value="investigate" 
                className={cn(
                  'text-xs gap-1.5 rounded-lg transition-all duration-200',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm'
                )}
              >
                <Search className="h-3 w-3" />
                Investigate
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className={cn(
                  'text-xs gap-1.5 rounded-lg transition-all duration-200',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm'
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                Security
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Demo Toggle */}
          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/30 rounded-lg px-3 py-1.5">
            <Switch 
              id="include-demos" 
              checked={includeDemos} 
              onCheckedChange={onIncludeDemosChange} 
            />
            <Label htmlFor="include-demos" className="text-xs text-muted-foreground cursor-pointer">
              Demos
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
