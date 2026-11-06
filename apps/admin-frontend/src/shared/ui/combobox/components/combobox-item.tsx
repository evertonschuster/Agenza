import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Item>
  );
}

function ComboboxItemIndicator({ className, ...props }: ComboboxPrimitive.ItemIndicator.Props) {
  return (
    <ComboboxPrimitive.ItemIndicator
      data-slot="combobox-item-indicator"
      className={cn(
        'pointer-events-none absolute right-2 flex size-4 items-center justify-center',
        className,
      )}
      {...props}
    >
      <CheckIcon aria-hidden="true" className="pointer-events-none" />
    </ComboboxPrimitive.ItemIndicator>
  );
}

export { ComboboxItem, ComboboxItemIndicator };
