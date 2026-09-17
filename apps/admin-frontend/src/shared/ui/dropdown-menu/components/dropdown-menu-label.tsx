import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from '@/shared/lib/utils';
import type { DropdownMenuLabelProps } from '../dropdown-menu.types';

function DropdownMenuLabel({ className, inset, ...props }: DropdownMenuLabelProps) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7',
        className,
      )}
      {...props}
    />
  );
}

export { DropdownMenuLabel };
