/**
 * BindingsRenderer — Generalized UI for department scope bindings.
 *
 * Renders checkboxes for each binding type defined in BINDING_TYPE_DEFS.
 * Adding a new binding type only requires registering it in module-registry.ts.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BINDING_TYPE_DEFS, type BindingTypeDef } from '@/lib/departments/module-registry';

interface BindingOption {
  key: string;
  label: string;
}

interface BindingsRendererProps {
  /** Currently selected keys per binding type */
  selections: Record<string, string[]>;
  /** Callback when a binding key is toggled */
  onToggle: (bindingType: string, key: string) => void;
  /** Available options per binding type */
  options: Record<string, BindingOption[]>;
}

export function BindingsRenderer({ selections, onToggle, options }: BindingsRendererProps) {
  return (
    <>
      {BINDING_TYPE_DEFS.map(def => {
        const opts = options[def.type];
        if (!opts || opts.length === 0) return null;

        return (
          <BindingTypeSection
            key={def.type}
            def={def}
            options={opts}
            selected={selections[def.type] ?? []}
            onToggle={(key) => onToggle(def.type, key)}
          />
        );
      })}
    </>
  );
}

function BindingTypeSection({
  def,
  options,
  selected,
  onToggle,
}: {
  def: BindingTypeDef;
  options: BindingOption[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-medium">{def.label}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">{def.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => (
          <label
            key={opt.key}
            className="flex items-center gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={selected.includes(opt.key)}
              onCheckedChange={() => onToggle(opt.key)}
            />
            <span className="text-xs font-medium">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
