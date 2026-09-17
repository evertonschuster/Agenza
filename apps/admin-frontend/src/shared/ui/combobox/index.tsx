import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';

import {
  ComboboxValue,
  ComboboxList,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChipsInput,
} from './components/combobox-primitives';
import { ComboboxTrigger } from './components/combobox-trigger';
import { ComboboxInput } from './components/combobox-input';
import { ComboboxContent } from './components/combobox-content';
import { ComboboxPaletteContent } from './components/combobox-palette-content';
import { ComboboxItem } from './components/combobox-item';
import { ComboboxChip } from './components/combobox-chip';

const Combobox = ComboboxPrimitive.Root;

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxPaletteContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
