import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { ComboboxLabel };
