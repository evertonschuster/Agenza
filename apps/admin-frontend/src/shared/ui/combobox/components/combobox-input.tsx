import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { cn } from '@/shared/lib/utils';
import { InputGroup, InputGroupInput } from '@/shared/ui/input-group';

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput />} {...props} />
    </InputGroup>
  );
}

export { ComboboxInput };
