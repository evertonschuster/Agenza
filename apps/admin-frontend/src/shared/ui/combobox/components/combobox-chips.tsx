import type * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { XIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

type ComboboxChipsProps = React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props;

function ComboboxChips({ className, ...props }: ComboboxChipsProps) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors has-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 has-[[data-slot=combobox-chip-input]:focus-visible]:border-ring has-[[data-slot=combobox-chip-input]:focus-visible]:ring-2 has-[[data-slot=combobox-chip-input]:focus-visible]:ring-ring has-[[data-slot=combobox-chip-input]:focus-visible]:ring-offset-2 has-[[data-slot=combobox-chip-input]:focus-visible]:ring-offset-background dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

interface ComboboxChipProps extends ComboboxPrimitive.Chip.Props {
  removeLabel: string;
  color?: string | undefined;
}

function ComboboxChip({ className, children, removeLabel, color, ...props }: ComboboxChipProps) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      style={color ? ({ '--tag': color } as React.CSSProperties) : undefined}
      className={cn(
        'flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0',
        color ? 'tag' : 'bg-muted text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ChipRemove
        render={<Button variant="ghost" size="icon-xs" />}
        aria-label={removeLabel}
        className="-ml-1 opacity-50 hover:opacity-100"
        data-slot="combobox-chip-remove"
      >
        <XIcon aria-hidden="true" className="pointer-events-none" />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        'h-6 min-w-16 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { ComboboxChips, ComboboxChip, ComboboxChipsInput };
