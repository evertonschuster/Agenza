import type { Combobox as ComboboxPrimitive } from '@base-ui/react';
import type * as React from 'react';

export type ComboboxTriggerProps = Readonly<ComboboxPrimitive.Trigger.Props>;

export type ComboboxStatusProps = Readonly<ComboboxPrimitive.Status.Props>;

export type ComboboxChipsProps = Readonly<
  React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props
>;

export type ComboboxChipProps = Readonly<ComboboxPrimitive.Chip.Props & { removeLabel: string }>;

export type ComboboxChipsInputProps = Readonly<ComboboxPrimitive.Input.Props>;

export type ComboboxItemIndicatorProps = Readonly<ComboboxPrimitive.ItemIndicator.Props>;

export type ComboboxContentProps = Readonly<
  ComboboxPrimitive.Popup.Props &
    Pick<
      ComboboxPrimitive.Positioner.Props,
      'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
    >
>;
