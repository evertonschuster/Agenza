import { Combobox as ComboboxPrimitive } from '@base-ui/react';

import {
  ComboboxTrigger,
  ComboboxList,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
  ComboboxStatus,
} from './components/combobox-primitives';
import { ComboboxChip, ComboboxChips, ComboboxChipsInput } from './components/combobox-chips';
import { ComboboxContent } from './components/combobox-content';
import { ComboboxInput } from './components/combobox-input';
import { ComboboxPaletteContent } from './components/combobox-palette-content';
import { ComboboxItem, ComboboxItemIndicator } from './components/combobox-item';

const Combobox = ComboboxPrimitive.Root;

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxPaletteContent,
  ComboboxTrigger,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxList,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
  ComboboxStatus,
};
