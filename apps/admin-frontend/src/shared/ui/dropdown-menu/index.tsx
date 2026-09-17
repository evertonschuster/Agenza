import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { DropdownMenuPortal } from './components/dropdown-menu-portal';
import { DropdownMenuTrigger } from './components/dropdown-menu-trigger';
import { DropdownMenuContent } from './components/dropdown-menu-content';
import { DropdownMenuGroup } from './components/dropdown-menu-group';
import { DropdownMenuLabel } from './components/dropdown-menu-label';
import { DropdownMenuItem } from './components/dropdown-menu-item';
import { DropdownMenuCheckboxItem } from './components/dropdown-menu-checkbox-item';
import { DropdownMenuRadioGroup } from './components/dropdown-menu-radio-group';
import { DropdownMenuRadioItem } from './components/dropdown-menu-radio-item';
import { DropdownMenuSeparator } from './components/dropdown-menu-separator';
import { DropdownMenuShortcut } from './components/dropdown-menu-shortcut';
import { DropdownMenuSub } from './components/dropdown-menu-sub';
import { DropdownMenuSubTrigger } from './components/dropdown-menu-sub-trigger';
import { DropdownMenuSubContent } from './components/dropdown-menu-sub-content';

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
