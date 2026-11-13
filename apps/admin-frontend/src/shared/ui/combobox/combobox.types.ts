import type { Combobox as ComboboxPrimitive } from '@base-ui/react';
import type * as React from 'react';

export type ComboboxChipsProps = React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props;

export type ComboboxChipProps = ComboboxPrimitive.Chip.Props & {
  removeLabel: string;
};

export type ComboboxContentProps = ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
  >;
