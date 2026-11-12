import type { Combobox as ComboboxPrimitive } from '@base-ui/react';

type InputKeyDown = NonNullable<ComboboxPrimitive.Input.Props['onKeyDown']>;

export const keepKeysInPicker: InputKeyDown = (event) => {
  const input = event.currentTarget;
  const open = input.getAttribute('aria-expanded') === 'true';
  if (event.key === 'Escape') {
    if (!open) event.preventBaseUIHandler();
    return;
  }
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
  if (!open) return;
  const modified = event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
  if (input.hasAttribute('aria-activedescendant') && !modified) return;
  event.preventDefault();
  event.preventBaseUIHandler();
};
