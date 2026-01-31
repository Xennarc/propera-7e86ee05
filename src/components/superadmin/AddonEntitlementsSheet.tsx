import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Flag,
  Loader2,
  Save,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type FeatureFlagCategory,
  type AddonWithCategories,
  ALL_CATEGORIES,
  CATEGORY_METADATA,
  useFeatureFlagsByCategory,
  useUpdateAddonEntitlements,
} from '@/hooks/useAddonEntitlements';

interface AddonEntitlementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addonKey: string;
  addonName: string;
  currentCategories: FeatureFlagCategory[];
  isPaidAddon: boolean;
}

export function AddonEntitlementsSheet({
  open,
  onOpenChange,
  addonKey,
  addonName,
  currentCategories,
  isPaidAddon,
}: AddonEntitlementsSheetProps) {
  const [selectedCategories, setSelectedCategories] = useState<FeatureFlagCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<FeatureFlagCategory>>(new Set());

  const { data: categoryData, isLoading: categoriesLoading } = useFeatureFlagsByCategory();
  const updateEntitlements = useUpdateAddonEntitlements();

  // Sync selected categories when sheet opens or currentCategories change
  useEffect(() => {
    if (open) {
      setSelectedCategories([...currentCategories]);
    }
  }, [open, currentCategories]);

  const toggleCategory = (category: FeatureFlagCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleExpanded = (category: FeatureFlagCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSave = async () => {
    await updateEntitlements.mutateAsync({
      addonKey,
      categories: selectedCategories,
    });
    onOpenChange(false);
  };

  const hasChanges =
    selectedCategories.length !== currentCategories.length ||
    selectedCategories.some((c) => !currentCategories.includes(c));

  // Check for dangerous assignments
  const hasDangerousAssignment =
    isPaidAddon &&
    (selectedCategories.includes('experimental') || selectedCategories.includes('danger'));

  const getCategoryFlagCount = (category: FeatureFlagCategory) => {
    return categoryData?.find((c) => c.category === category)?.flagCount ?? 0;
  };

  const getCategoryFlags = (category: FeatureFlagCategory) => {
    return categoryData?.find((c) => c.category === category)?.flags ?? [];
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Edit Entitlements
          </SheetTitle>
          <SheetDescription>
            Configure which feature flag categories are included with{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{addonKey}</code>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Select categories to include:
          </h4>

          {categoriesLoading ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {ALL_CATEGORIES.map((category) => {
                const meta = CATEGORY_METADATA[category];
                const flagCount = getCategoryFlagCount(category);
                const flags = getCategoryFlags(category);
                const isSelected = selectedCategories.includes(category);
                const isExpanded = expandedCategories.has(category);
                const isDanger = category === 'danger' || category === 'experimental';

                return (
                  <div
                    key={category}
                    className={cn(
                      'rounded-lg border transition-colors',
                      isSelected
                        ? isDanger
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'border-primary/50 bg-primary/5'
                        : 'border-border/50 bg-muted/20'
                    )}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`cat-${category}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleCategory(category)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`cat-${category}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {meta.label}
                            </label>
                            <Badge
                              variant={meta.variant as any}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {flagCount} flags
                            </Badge>
                            {isDanger && (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                        {flagCount > 0 && (
                          <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(category)}>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        )}
                      </div>
                    </div>

                    {/* Expanded flags list */}
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0">
                          <div className="border-t border-border/30 pt-2 mt-1">
                            {flagCount === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-2">
                                No flags in this category yet
                              </p>
                            ) : (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {flags.map((flag) => (
                                  <div
                                    key={flag.key}
                                    className="flex items-center gap-2 text-xs py-1"
                                  >
                                    <Flag className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                    <code className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                                      {flag.key}
                                    </code>
                                    <span className="text-muted-foreground truncate">
                                      {flag.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Warning for dangerous assignments */}
        {hasDangerousAssignment && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Caution: Experimental/Danger categories
                </p>
                <p className="text-muted-foreground mt-0.5">
                  You are assigning experimental or danger categories to a paid add-on.
                  These features may change or affect platform stability.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateEntitlements.isPending}
          >
            {updateEntitlements.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
