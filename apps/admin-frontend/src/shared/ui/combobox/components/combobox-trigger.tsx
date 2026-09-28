import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  );
}

export { ComboboxTrigger };
