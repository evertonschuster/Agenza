import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { ComboboxChipsInput };
