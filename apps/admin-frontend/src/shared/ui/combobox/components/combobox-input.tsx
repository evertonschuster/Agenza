import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';
import type { ComboboxInputProps } from '../combobox.types';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';

import { ComboboxTrigger } from './combobox-trigger';
import { ComboboxClear } from './combobox-clear';

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxInputProps) {
  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      {(showTrigger || showClear) && (
        <InputGroupAddon align="inline-end">
          {showTrigger && (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              render={<ComboboxTrigger />}
              data-slot="input-group-button"
              className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
              disabled={disabled}
            />
          )}
          {showClear && <ComboboxClear disabled={disabled} />}
        </InputGroupAddon>
      )}
      {children}
    </InputGroup>
  );
}

export { ComboboxInput };
