import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';

import { ComboboxValue } from './components/combobox-value';
import { ComboboxTrigger } from './components/combobox-trigger';
import { ComboboxInput } from './components/combobox-input';
import { ComboboxContent } from './components/combobox-content';
import { ComboboxPaletteContent } from './components/combobox-palette-content';
import { ComboboxList } from './components/combobox-list';
import { ComboboxItem } from './components/combobox-item';
import { ComboboxGroup } from './components/combobox-group';
import { ComboboxLabel } from './components/combobox-label';
import { ComboboxCollection } from './components/combobox-collection';
import { ComboboxEmpty } from './components/combobox-empty';
import { ComboboxSeparator } from './components/combobox-separator';
import { ComboboxChips } from './components/combobox-chips';
import { ComboboxChip } from './components/combobox-chip';
import { ComboboxChipsInput } from './components/combobox-chips-input';

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
