import type { Menu as MenuPrimitive } from '@base-ui/react/menu';

export type DropdownMenuLabelProps = MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
};

export type DropdownMenuItemProps = MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};

export type DropdownMenuSubTriggerProps = MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
};

export type DropdownMenuCheckboxItemProps = MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
};

export type DropdownMenuRadioItemProps = MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
};
