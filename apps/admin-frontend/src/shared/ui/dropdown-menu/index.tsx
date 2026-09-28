import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import {
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './components/dropdown-menu-primitives';
import { DropdownMenuContent } from './components/dropdown-menu-content';
import { DropdownMenuItem } from './components/dropdown-menu-item';
import { DropdownMenuCheckboxItem } from './components/dropdown-menu-checkbox-item';
import { DropdownMenuRadioItem } from './components/dropdown-menu-radio-item';
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
