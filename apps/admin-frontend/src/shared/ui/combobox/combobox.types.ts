import type { Combobox as ComboboxPrimitive } from '@base-ui/react';

export type ComboboxInputProps = ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
};

export type ComboboxChipProps = ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
};
